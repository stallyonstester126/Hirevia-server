import { createJob, getCompanyJobs, getCompanyJobById, updateJob, deleteJob, closeJob, publishJob, getPublicJobs, getPublicJobById } from '../../APIs/job/_shared/services/job.service'
import jobRepository from '../../APIs/job/_shared/repo/job.repository'
import userRepository from '../../APIs/user/_shared/repo/user.repository'
import { CustomError } from '../../utils/errors'
import { EEmploymentType, EExperienceLevel, EJobStatus, EPaymentStatus, EWorkplaceType } from '../../constant/jobs'
import { IJob } from '../../APIs/job/_shared/types/job.interface'

jest.mock('../../APIs/job/_shared/repo/job.repository')
jest.mock('../../APIs/user/_shared/repo/user.repository')

describe('Job Service', () => {
    const mockCompanyId = 'company123'
    const mockJob: IJob = {
        companyId: mockCompanyId,
        title: 'Node Developer',
        description: 'Excellent Node position',
        responsibilities: ['Write clean code'],
        requirements: ['3 years Node exp'],
        skills: ['Node.js', 'Express'],
        employmentType: EEmploymentType.FULL_TIME,
        experienceLevel: EExperienceLevel.MID,
        location: { city: 'Karachi', country: 'Pakistan' },
        workplaceType: EWorkplaceType.REMOTE,
        salary: { min: 3000, max: 5000, currency: 'USD', period: 'MONTHLY' },
        status: EJobStatus.DRAFT,
        paymentStatus: EPaymentStatus.UNPAID
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('createJob', () => {
        it('should reject job creation if company does not have an active paid membership', async () => {
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                _id: mockCompanyId,
                subscriptionStatus: 'UNPAID'
            })

            const data = { title: 'Node Developer', description: 'Excellent Node position' } as any
            await expect(createJob(mockCompanyId, data)).rejects.toThrow(
                'Company membership is required to post jobs'
            )
        })

        it('should create and auto-publish job as PUBLISHED and PAID for subscribed companies', async () => {
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                _id: mockCompanyId,
                subscriptionStatus: 'PAID'
            })
            ;(jobRepository.create as jest.Mock).mockResolvedValue({
                ...mockJob,
                status: EJobStatus.PUBLISHED,
                paymentStatus: EPaymentStatus.PAID
            })

            const data = { title: 'Node Developer', description: 'Excellent Node position', companyId: 'maliciousOverride' } as any
            const result = await createJob(mockCompanyId, data)

            expect(result).toBeDefined()
            expect(jobRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    companyId: mockCompanyId,
                    status: EJobStatus.PUBLISHED,
                    paymentStatus: EPaymentStatus.PAID
                })
            )
        })
    })

    describe('getCompanyJobs', () => {
        it('should return paginated list of company jobs', async () => {
            const mockJobsList = [mockJob]
            ;(jobRepository.findByCompanyId as jest.Mock).mockResolvedValue(mockJobsList)
            ;(jobRepository.countByCompanyId as jest.Mock).mockResolvedValue(1)

            const result = await getCompanyJobs(mockCompanyId, 1, 10)
            expect(result.jobs).toEqual(mockJobsList)
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1
            })
        })
    })

    describe('getCompanyJobById', () => {
        it('should return job if it belongs to the company', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)

            const result = await getCompanyJobById(mockCompanyId, 'job123')
            expect(result).toEqual(mockJob)
        })

        it('should throw 404 CustomError if job belongs to another company', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue({
                ...mockJob,
                companyId: 'anotherCompany'
            })

            await expect(getCompanyJobById(mockCompanyId, 'job123')).rejects.toThrow(
                new CustomError('Job not found', 404)
            )
        })
    })

    describe('updateJob', () => {
        it('should update job allowed fields and prevent companyId or paymentStatus overrides', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(jobRepository.update as jest.Mock).mockResolvedValue({
                ...mockJob,
                title: 'Senior Node Developer'
            })

            const updateData = { title: 'Senior Node Developer', companyId: 'overriddenId', paymentStatus: EPaymentStatus.PAID }
            const result = await updateJob(mockCompanyId, 'job123', updateData as any)

            expect(result!.title).toBe('Senior Node Developer')
            expect(jobRepository.update).toHaveBeenCalledWith('job123', {
                title: 'Senior Node Developer'
            })
        })
    })

    describe('deleteJob', () => {
        it('should allow deletion if job status is DRAFT or CLOSED', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(jobRepository.delete as jest.Mock).mockResolvedValue({ success: true })

            const result = await deleteJob(mockCompanyId, 'job123')
            expect(result).toEqual({ success: true })
            expect(jobRepository.delete).toHaveBeenCalledWith('job123')
        })

        it('should throw 400 CustomError if job status is PUBLISHED', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue({
                ...mockJob,
                status: EJobStatus.PUBLISHED
            })

            await expect(deleteJob(mockCompanyId, 'job123')).rejects.toThrow(
                new CustomError('Active published jobs must be closed before they can be deleted', 400)
            )
        })
    })

    describe('closeJob', () => {
        it('should transition status to CLOSED if job is PUBLISHED', async () => {
            const mockSave = jest.fn()
            const publishedJob = {
                ...mockJob,
                status: EJobStatus.PUBLISHED,
                save: mockSave
            }
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(publishedJob)

            const result = await closeJob(mockCompanyId, 'job123')
            expect(result.status).toBe(EJobStatus.CLOSED)
            expect(mockSave).toHaveBeenCalled()
        })

        it('should throw 400 CustomError if job is in DRAFT state', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)

            await expect(closeJob(mockCompanyId, 'job123')).rejects.toThrow(
                new CustomError('Only published jobs can be closed', 400)
            )
        })
    })

    describe('publishJob', () => {
        it('should throw 400 CustomError if company subscription is UNPAID and job is UNPAID', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                _id: mockCompanyId,
                subscriptionStatus: 'UNPAID'
            })

            await expect(publishJob(mockCompanyId, 'job123')).rejects.toThrow(
                new CustomError(
                    'Company membership is required to publish jobs. Please activate your company membership ($10 one-time) for unlimited job postings.',
                    400
                )
            )
        })

        it('should publish successfully if company subscription is PAID', async () => {
            const mockSave = jest.fn()
            const draftJob = {
                ...mockJob,
                paymentStatus: EPaymentStatus.UNPAID,
                save: mockSave
            }
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(draftJob)
            ;(userRepository.findUserById as jest.Mock).mockResolvedValue({
                _id: mockCompanyId,
                subscriptionStatus: 'PAID'
            })

            const result = await publishJob(mockCompanyId, 'job123')
            expect(result.status).toBe(EJobStatus.PUBLISHED)
            expect(result.paymentStatus).toBe(EPaymentStatus.PAID)
            expect(mockSave).toHaveBeenCalled()
        })
    })

    describe('getPublicJobs', () => {
        it('should fetch only published jobs, mapping search, filters and sorting', async () => {
            const mockJobsList = [{ ...mockJob, status: EJobStatus.PUBLISHED }]
            ;(jobRepository.queryPublishedJobs as jest.Mock).mockResolvedValue(mockJobsList)
            ;(jobRepository.countPublishedJobs as jest.Mock).mockResolvedValue(1)

            const query = { page: 1, limit: 12, search: 'Node', workplaceType: 'REMOTE' }
            const result = await getPublicJobs(query)

            expect(result.jobs).toEqual(mockJobsList)
            expect(jobRepository.queryPublishedJobs).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: EJobStatus.PUBLISHED,
                    workplaceType: 'REMOTE'
                }),
                1,
                12
            )
        })
    })

    describe('getPublicJobById', () => {
        it('should return job if it is PUBLISHED', async () => {
            const publishedJob = { ...mockJob, status: EJobStatus.PUBLISHED }
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(publishedJob)

            const result = await getPublicJobById('job123')
            expect(result).toEqual(publishedJob)
        })

        it('should throw 404 CustomError if job is in DRAFT or CLOSED status', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob) // status is DRAFT

            await expect(getPublicJobById('job123')).rejects.toThrow(
                new CustomError('Job not found', 404)
            )
        })
    })
})
