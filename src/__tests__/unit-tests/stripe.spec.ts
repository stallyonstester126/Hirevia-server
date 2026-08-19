import { createJobCheckoutSession, getJobPaymentStatus } from '../../APIs/company/_shared/services/payment.service'
import { handleStripeWebhook } from '../../APIs/company/_shared/services/webhook.service'
import jobRepository from '../../APIs/job/_shared/repo/job.repository'
import paymentRepository from '../../APIs/company/_shared/repo/payment.repository'
import stripeService from '../../services/stripe'
import { CustomError } from '../../utils/errors'
import { EJobStatus, EPaymentStatus } from '../../constant/jobs'

jest.mock('../../APIs/job/_shared/repo/job.repository')
jest.mock('../../APIs/company/_shared/repo/payment.repository')
jest.mock('../../services/stripe')

describe('Stripe Payments Service', () => {
    const mockCompanyId = 'company123'
    const mockCompanyEmail = 'recruiter@company.com'
    const mockJobId = 'job789'
    const mockSessionId = 'cs_test_999'
    const mockPaymentIntentId = 'pi_test_999'

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
        save: jest.fn().mockResolvedValue(true)
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('createJobCheckoutSession', () => {
        it('should create checkout session successfully and store a pending payment record', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(paymentRepository.findPendingOrSucceededByJob as jest.Mock).mockResolvedValue(null)
            ;(stripeService.createCheckoutSession as jest.Mock).mockResolvedValue({
                id: mockSessionId,
                url: 'https://checkout.stripe.com/pay'
            })
            ;(paymentRepository.create as jest.Mock).mockResolvedValue(mockPaymentRecord)

            const result = await createJobCheckoutSession(mockCompanyId, mockCompanyEmail, mockJobId)
            expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay')
            expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(mockJobId, mockCompanyEmail, undefined, undefined)
            expect(paymentRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    jobId: mockJobId,
                    stripeSessionId: mockSessionId,
                    status: 'PENDING'
                })
            )
        })

        it('should throw 404 CustomError if job does not belong to company', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue({
                ...mockJob,
                companyId: 'anotherCompany'
            })

            await expect(createJobCheckoutSession(mockCompanyId, mockCompanyEmail, mockJobId)).rejects.toThrow(
                new CustomError('Job not found', 404)
            )
        })

        it('should throw 400 CustomError if job is already paid', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue({
                ...mockJob,
                paymentStatus: EPaymentStatus.PAID
            })

            await expect(createJobCheckoutSession(mockCompanyId, mockCompanyEmail, mockJobId)).rejects.toThrow(
                new CustomError('Job is already paid', 400)
            )
        })

        it('should throw 409 CustomError if another payment record for this job is PENDING', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(paymentRepository.findPendingOrSucceededByJob as jest.Mock).mockResolvedValue(mockPaymentRecord)

            await expect(createJobCheckoutSession(mockCompanyId, mockCompanyEmail, mockJobId)).rejects.toThrow(
                new CustomError('Checkout session is already pending for this job', 409)
            )
        })
    })

    describe('getJobPaymentStatus', () => {
        it('should return job paymentStatus and record if owner asks', async () => {
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

        it('should process checkout.session.completed event idempotently and transition job payment status to PAID', async () => {
            const mockCompletedEvent = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: mockSessionId,
                        payment_intent: mockPaymentIntentId
                    }
                }
            }
            ;(stripeService.constructEvent as jest.Mock).mockReturnValue(mockCompletedEvent)
            ;(paymentRepository.findBySessionId as jest.Mock).mockResolvedValue(mockPaymentRecord)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)

            const result = await handleStripeWebhook(rawBody, signature)
            expect(result.received).toBe(true)
            expect(mockPaymentRecord.status).toBe('SUCCEEDED')
            expect(mockPaymentRecord.stripePaymentIntentId).toBe(mockPaymentIntentId)
            expect(mockPaymentRecord.save).toHaveBeenCalled()
            expect(mockJob.paymentStatus).toBe(EPaymentStatus.PAID)
            expect(mockJob.save).toHaveBeenCalled()

            // Test idempotency: process same webhook completed event again
            mockPaymentRecord.status = 'SUCCEEDED'
            jest.clearAllMocks()

            const replayedResult = await handleStripeWebhook(rawBody, signature)
            expect(replayedResult.message).toBe('Payment already processed')
            expect(mockPaymentRecord.save).not.toHaveBeenCalled()
            expect(mockJob.save).not.toHaveBeenCalled()
        })

        it('should transition payment status to FAILED on checkout.session.expired event', async () => {
            const mockExpiredEvent = {
                type: 'checkout.session.expired',
                data: {
                    object: {
                        id: mockSessionId
                    }
                }
            }
            ;(stripeService.constructEvent as jest.Mock).mockReturnValue(mockExpiredEvent)
            ;(paymentRepository.findBySessionId as jest.Mock).mockResolvedValue(mockPaymentRecord)
            
            mockPaymentRecord.status = 'PENDING'

            const result = await handleStripeWebhook(rawBody, signature)
            expect(result.received).toBe(true)
            expect(mockPaymentRecord.status).toBe('FAILED')
            expect(mockPaymentRecord.save).toHaveBeenCalled()
        })
    })
})
