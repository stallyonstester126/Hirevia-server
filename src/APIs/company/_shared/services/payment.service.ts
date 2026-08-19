import jobRepository from '../../../job/_shared/repo/job.repository'
import paymentRepository from '../repo/payment.repository'
import stripeService from '../../../../services/stripe'
import { CustomError } from '../../../../utils/errors'
import { IPayment } from '../types/payment.interface'
import { EJobStatus, EPaymentStatus } from '../../../../constant/jobs'

export const createJobCheckoutSession = async (
    companyId: string,
    companyEmail: string,
    jobId: string,
    successUrl?: string,
    cancelUrl?: string
) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    if (job.status !== EJobStatus.DRAFT) {
        throw new CustomError('Checkout sessions can only be created for draft jobs', 400)
    }

    if (job.paymentStatus === EPaymentStatus.PAID) {
        throw new CustomError('Job is already paid', 400)
    }

    const existingPayment = await paymentRepository.findPendingOrSucceededByJob(jobId)
    if (existingPayment) {
        if (existingPayment.status === 'SUCCEEDED') {
            throw new CustomError('Job is already paid', 400)
        }

        // Auto-reconcile: check if the pending session was already paid on Stripe
        if (existingPayment.stripeSessionId) {
            try {
                const session = await stripeService.retrieveSession(existingPayment.stripeSessionId)
                if (session && session.payment_status === 'paid') {
                    existingPayment.status = 'SUCCEEDED'
                    existingPayment.paidAt = new Date()
                    existingPayment.stripePaymentIntentId = session.payment_intent as string
                    await existingPayment.save()

                    job.paymentStatus = EPaymentStatus.PAID
                    await job.save()
                    throw new CustomError('Job payment was already completed. You can now publish this job', 400)
                } else if (session && session.status === 'open' && session.url) {
                    return {
                        checkoutUrl: session.url
                    }
                }
            } catch (err) {
                if (err instanceof CustomError) throw err
            }
        }

        throw new CustomError('Checkout session is already pending for this job', 409)
    }

    const session = await stripeService.createCheckoutSession(jobId, companyEmail, successUrl, cancelUrl)

    const payload: IPayment = {
        jobId,
        companyId,
        stripeSessionId: session.id,
        amount: 1000, // $10.00 USD in cents
        currency: 'usd',
        status: 'PENDING'
    }

    await paymentRepository.create(payload)

    return {
        checkoutUrl: session.url
    }
}

export const getJobPaymentStatus = async (companyId: string, jobId: string) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    const payment = await paymentRepository.findByJobId(jobId)

    // Reconcile with Stripe if payment is pending
    if (payment && payment.stripeSessionId && payment.status === 'PENDING') {
        try {
            const session = await stripeService.retrieveSession(payment.stripeSessionId)
            if (session && session.payment_status === 'paid') {
                payment.status = 'SUCCEEDED'
                payment.paidAt = new Date()
                payment.stripePaymentIntentId = session.payment_intent as string
                await payment.save()

                if (job.paymentStatus !== EPaymentStatus.PAID) {
                    job.paymentStatus = EPaymentStatus.PAID
                    await job.save()
                }
            }
        } catch {
            // Ignore Stripe retrieve errors
        }
    }

    return {
        paymentStatus: job.paymentStatus,
        payment: payment || null
    }
}

export const confirmSessionPayment = async (companyId: string, sessionId: string) => {
    const payment = await paymentRepository.findBySessionId(sessionId)
    if (!payment) {
        throw new CustomError('Payment record not found', 404)
    }

    const job = await jobRepository.findById(payment.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    try {
        const session = await stripeService.retrieveSession(sessionId)
        if (session && session.payment_status === 'paid') {
            if (payment.status !== 'SUCCEEDED') {
                payment.status = 'SUCCEEDED'
                payment.paidAt = new Date()
                payment.stripePaymentIntentId = session.payment_intent as string
                await payment.save()
            }

            if (job.paymentStatus !== EPaymentStatus.PAID) {
                job.paymentStatus = EPaymentStatus.PAID
                await job.save()
            }
        }
    } catch {
        // Fallback: If session lookup failed but user was redirected, we can still return current state
    }

    return {
        jobId: (job as any)._id?.toString() || job.id,
        jobTitle: job.title,
        status: job.status,
        paymentStatus: job.paymentStatus,
        payment
    }
}
