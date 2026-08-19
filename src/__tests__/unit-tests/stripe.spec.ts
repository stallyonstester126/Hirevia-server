import {
    createCompanySubscriptionCheckout,
    getCompanySubscriptionStatus,
    createJobCheckoutSession,
    getJobPaymentStatus
} from '../../APIs/company/_shared/services/payment.service'
import { handleStripeWebhook } from '../../APIs/company/_shared/services/webhook.service'
import jobRepository from '../../APIs/job/_shared/repo/job.repository'
import paymentRepository from '../../APIs/company/_shared/repo/payment.repository'
import userRepository from '../../APIs/user/_shared/repo/user.repository'
import stripeService from '../../services/stripe'
import { CustomError } from '../../utils/errors'
import { EJobStatus, EPaymentStatus } from '../../constant/jobs'

jest.mock('../../APIs/job/_shared/repo/job.repository')
jest.mock('../../APIs/company/_shared/repo/payment.repository')
jest.mock('../../APIs/user/_shared/repo/user.repository')
jest.mock('../../services/stripe')

describe('Stripe Payments & Company Subscription Service', () => {
    const mockCompanyId = 'company123'
    const mockCompanyEmail = 'recruiter@company.com'
    const mockJobId = 'job789'
    const mockSessionId = 'cs_test_999'
    const mockPaymentIntentId = 'pi_test_999'

    const mockCompanyUser: any = {
        _id: mockCompanyId,
        email: mockCompanyEmail,
        subscriptionStatus: 'UNPAID',
        save: jest.fn().mockResolvedValue(true)
    }

    const mockJob = {
        _id: mockJobId,
        companyId: mockCompanyId,
        status: EJobStatus.DRAFT,
        paymentStatus: EPaymentStatus.UNPAID,
        save: jest.fn().mockResolvedValue(true)
    }

    const mockPaymentRecord: any = {
        jobId: mockJobId,
        companyId: mockCompanyId,
        stripeSessionId: mockSessionId,
        amount: 1000,
        currency: 'usd',
        status: 'PENDING',
        type: 'SUBSCRIPTION',
        save: jest.fn().mockResolvedValue(true)
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('createCompanySubscriptionCheckout', () => {
        it('should create subscription checkout session and record pending payment', async () => {
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                ...mockCompanyUser,
                subscriptionStatus: 'UNPAID'
            })
            ;(stripeService.createSubscriptionCheckoutSession as jest.Mock).mockResolvedValue({
                id: mockSessionId,
                url: 'https://checkout.stripe.com/pay-subscription'
            })
            ;(paymentRepository.create as jest.Mock).mockResolvedValue(mockPaymentRecord)

            const result = await createCompanySubscriptionCheckout(mockCompanyId, mockCompanyEmail)
            expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay-subscription')
            expect(paymentRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    companyId: mockCompanyId,
                    type: 'SUBSCRIPTION',
                    status: 'PENDING'
                })
            )
        })

        it('should throw 400 CustomError if company subscription is already active', async () => {
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                ...mockCompanyUser,
                subscriptionStatus: 'PAID'
            })

            await expect(createCompanySubscriptionCheckout(mockCompanyId, mockCompanyEmail)).rejects.toThrow(
                new CustomError('Company membership is already active with unlimited job postings', 400)
            )
        })
    })

    describe('getCompanySubscriptionStatus', () => {
        it('should return subscription status for company', async () => {
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                ...mockCompanyUser,
                subscriptionStatus: 'PAID',
                subscriptionPaidAt: new Date('2026-08-01')
            })

            const result = await getCompanySubscriptionStatus(mockCompanyId)
            expect(result.subscriptionStatus).toBe('PAID')
            expect(result.subscriptionPaidAt).toEqual(new Date('2026-08-01'))
        })
    })

    describe('createJobCheckoutSession', () => {
        it('should create job checkout session if company is unpaid', async () => {
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                ...mockCompanyUser,
                subscriptionStatus: 'UNPAID'
            })
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(paymentRepository.findPendingOrSucceededByJob as jest.Mock).mockResolvedValue(null)
            ;(stripeService.createSubscriptionCheckoutSession as jest.Mock).mockResolvedValue({
                id: mockSessionId,
                url: 'https://checkout.stripe.com/pay'
            })
            ;(paymentRepository.create as jest.Mock).mockResolvedValue(mockPaymentRecord)

            const result = await createJobCheckoutSession(mockCompanyId, mockCompanyEmail, mockJobId)
            expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay')
        })
    })

    describe('getJobPaymentStatus', () => {
        it('should return job payment status and payment record', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(paymentRepository.findByJobId as jest.Mock).mockResolvedValue(mockPaymentRecord)

            const result = await getJobPaymentStatus(mockCompanyId, mockJobId)
            expect(result.paymentStatus).toBe(EPaymentStatus.UNPAID)
            expect(result.payment).toEqual(mockPaymentRecord)
        })
    })

    describe('handleStripeWebhook', () => {
        const rawBody = Buffer.from('RAW_BODY_STRING')
        const signature = 't=123,v1=abc'

        it('should verify signature and throw 400 on constructEvent failure', async () => {
            ;(stripeService.constructEvent as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid signature')
            })

            await expect(handleStripeWebhook(rawBody, signature)).rejects.toThrow(
                new CustomError('Webhook Signature Verification Failed: Invalid signature', 400)
            )
        })

        it('should process checkout.session.completed event idempotently, activate subscription and mark job as PAID', async () => {
            const mockCompletedEvent = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: mockSessionId,
                        payment_intent: mockPaymentIntentId,
                        metadata: {
                            companyId: mockCompanyId,
                            type: 'SUBSCRIPTION'
                        }
                    }
                }
            }
            const userToUpdate = { ...mockCompanyUser, save: jest.fn().mockResolvedValue(true) }
            ;(stripeService.constructEvent as jest.Mock).mockReturnValue(mockCompletedEvent)
            ;(paymentRepository.findBySessionId as jest.Mock).mockResolvedValue(mockPaymentRecord)
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue(userToUpdate)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)

            const result = await handleStripeWebhook(rawBody, signature)
            expect(result.received).toBe(true)
            expect(userToUpdate.subscriptionStatus).toBe('PAID')
            expect(userToUpdate.save).toHaveBeenCalled()
            expect(mockPaymentRecord.status).toBe('SUCCEEDED')
            expect(mockPaymentRecord.stripePaymentIntentId).toBe(mockPaymentIntentId)
            expect(mockPaymentRecord.save).toHaveBeenCalled()
            expect(mockJob.paymentStatus).toBe(EPaymentStatus.PAID)
            expect(mockJob.save).toHaveBeenCalled()
        })
    })
})
