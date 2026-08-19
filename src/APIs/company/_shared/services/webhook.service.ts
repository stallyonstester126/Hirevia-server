import stripeService from '../../../../services/stripe'
import paymentRepository from '../repo/payment.repository'
import jobRepository from '../../../job/_shared/repo/job.repository'
import { EPaymentStatus } from '../../../../constant/jobs'
import { CustomError } from '../../../../utils/errors'

export const handleStripeWebhook = async (rawBody: Buffer, signature: string) => {
    let event: any
    try {
        event = stripeService.constructEvent(rawBody, signature)
    } catch (error: any) {
        throw new CustomError(`Webhook Signature Verification Failed: ${error.message}`, 400)
    }

    const session = event.data.object

    switch (event.type) {
        case 'checkout.session.completed': {
            const payment = await paymentRepository.findBySessionId(session.id)
            if (!payment) {
                // If payment record wasn't found in DB, we ignore or log. We should log.
                break
            }

            // Webhook Idempotency Check
            if (payment.status === 'SUCCEEDED') {
                return { received: true, message: 'Payment already processed' }
            }

            // Update payment record status
            payment.status = 'SUCCEEDED'
            payment.paidAt = new Date()
            payment.stripePaymentIntentId = session.payment_intent as string
            await payment.save()

            // Update job payment status to PAID
            const job = await jobRepository.findById(payment.jobId.toString())
            if (job) {
                job.paymentStatus = EPaymentStatus.PAID
                await job.save()
            }
            break
        }

        case 'checkout.session.expired':
        case 'payment_intent.payment_failed': {
            // Expire session or fail payment intent
            const sessionId = session.id || (session.setup_intent ? null : session.id)
            if (sessionId) {
                const payment = await paymentRepository.findBySessionId(sessionId)
                if (payment && payment.status === 'PENDING') {
                    payment.status = 'FAILED'
                    await payment.save()
                }
            }
            break
        }

        default:
            // Safely ignore other event types
            break
    }

    return { received: true }
}
