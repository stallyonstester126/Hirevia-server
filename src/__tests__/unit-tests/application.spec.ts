import { applyToJob, getSeekerApplications, getSeekerApplicationById, withdrawApplication, getJobApplications, getCompanyApplicationById, updateApplicationStatus } from '../../APIs/application/_shared/services/application.service'
import applicationRepository from '../../APIs/application/_shared/repo/application.repository'
import jobRepository from '../../APIs/job/_shared/repo/job.repository'
import seekerProfileRepository from '../../APIs/seeker/_shared/repo/seekerProfile.repository'
import resumeRepository from '../../APIs/seeker/_shared/repo/resume.repository'
import { CustomError } from '../../utils/errors'
import { EApplicationStatus } from '../../constant/applications'
import { EJobStatus, EPaymentStatus } from '../../constant/jobs'
import { IApplication } from '../../APIs/application/_shared/types/application.interface'

jest.mock('../../APIs/application/_shared/repo/application.repository')
jest.mock('../../APIs/job/_shared/repo/job.repository')
jest.mock('../../APIs/seeker/_shared/repo/seekerProfile.repository')
jest.mock('../../APIs/seeker/_shared/repo/resume.repository')

describe('Application Service', () => {
    const mockSeekerId = 'seeker789'
    const mockCompanyId = 'company456'
    const mockJobId = 'job123'
    const mockAppId = 'app999'
    const mockResumeId = 'resume123'

    const mockJob = {
        _id: mockJobId,
        companyId: mockCompanyId,
        title: 'Node Developer',
        status: EJobStatus.PUBLISHED,
        paymentStatus: EPaymentStatus.PAID
    }

    const mockResume = {
        _id: mockResumeId,
        seekerId: mockSeekerId,
        isActive: true
    }

    const mockApplication: IApplication = {
        jobId: mockJobId,
        seekerId: mockSeekerId,
        resumeId: mockResumeId,
        coverLetter: 'I am a good fit.',
        status: EApplicationStatus.SUBMITTED,
        appliedAt: new Date()
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('applyToJob', () => {
        it('should allow seeker to apply to a published job with their own resume', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(applicationRepository.findByJobAndSeeker as jest.Mock).mockResolvedValue(null)
            ;(applicationRepository.create as jest.Mock).mockResolvedValue(mockApplication)

            const result = await applyToJob(mockSeekerId, mockJobId, mockResumeId, 'I am a good fit.')
            expect(result).toEqual(mockApplication)
            expect(applicationRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    jobId: mockJobId,
                    seekerId: mockSeekerId,
                    resumeId: mockResumeId,
                    coverLetter: 'I am a good fit.',
                    status: EApplicationStatus.SUBMITTED
                })
            )
        })

        it('should throw 403 CustomError if resume belongs to another seeker', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue({
                ...mockResume,
                seekerId: 'anotherSeekerId'
            })

            await expect(applyToJob(mockSeekerId, mockJobId, mockResumeId, 'I am a good fit.')).rejects.toThrow(
                new CustomError('You are not authorized to use this resume', 403)
            )
        })

        it('should throw 400 CustomError if resumeId is missing', async () => {
            await expect(applyToJob(mockSeekerId, mockJobId, '', 'I am a good fit.')).rejects.toThrow(
                new CustomError('Resume is required to apply', 400)
            )
        })

        it('should throw 400 CustomError if job is not published', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue({
                ...mockJob,
                status: EJobStatus.DRAFT
            })

            await expect(applyToJob(mockSeekerId, mockJobId, mockResumeId)).rejects.toThrow(
                new CustomError('Only published jobs accept applications', 400)
            )
        })

        it('should throw 409 CustomError if seeker has already applied to this job', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(applicationRepository.findByJobAndSeeker as jest.Mock).mockResolvedValue(mockApplication)

            await expect(applyToJob(mockSeekerId, mockJobId, mockResumeId)).rejects.toThrow(
                new CustomError('You have already applied for this job', 409)
            )
        })
    })

    describe('getSeekerApplications', () => {
        it('should retrieve seeker applications list', async () => {
            ;(applicationRepository.findSeekerApps as jest.Mock).mockResolvedValue([mockApplication])
            ;(applicationRepository.countSeekerApps as jest.Mock).mockResolvedValue(1)

            const result = await getSeekerApplications(mockSeekerId, 1, 10)
            expect(result.applications).toEqual([mockApplication])
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1
            })
        })
    })

    describe('getSeekerApplicationById', () => {
        it('should retrieve application if owned by seeker', async () => {
            const mockAppObj = {
                ...mockApplication,
                populate: jest.fn().mockResolvedValue(this)
            }
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockAppObj)

            const result = await getSeekerApplicationById(mockSeekerId, mockAppId)
            expect(result).toEqual(mockAppObj)
        })

        it('should throw 404 if application does not belong to seeker', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue({
                ...mockApplication,
                seekerId: 'anotherSeeker'
            })

            await expect(getSeekerApplicationById(mockSeekerId, mockAppId)).rejects.toThrow(
                new CustomError('Application not found', 404)
            )
        })
    })

    describe('withdrawApplication', () => {
        it('should transition status to WITHDRAWN if eligible', async () => {
            const mockSave = jest.fn()
            const mockAppObj = {
                ...mockApplication,
                status: EApplicationStatus.SUBMITTED,
                save: mockSave
            }
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockAppObj)

            const result = await withdrawApplication(mockSeekerId, mockAppId)
            expect(result.status).toBe(EApplicationStatus.WITHDRAWN)
            expect(mockSave).toHaveBeenCalled()
        })

        it('should throw 400 if application status is already HIRED', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue({
                ...mockApplication,
                status: EApplicationStatus.HIRED
            })

            await expect(withdrawApplication(mockSeekerId, mockAppId)).rejects.toThrow(
                new CustomError('Application cannot be withdrawn in its current state', 400)
            )
        })
    })

    describe('getJobApplications', () => {
        it('should retrieve applications list for owned job', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(applicationRepository.findJobApps as jest.Mock).mockResolvedValue([mockApplication])
            ;(applicationRepository.countJobApps as jest.Mock).mockResolvedValue(1)

            const result = await getJobApplications(mockCompanyId, mockJobId, 1, 20)
            expect(result.applications).toEqual([mockApplication])
        })

        it('should throw 404 if job does not belong to company', async () => {
            ;(jobRepository.findById as jest.Mock).mockResolvedValue({
                ...mockJob,
                companyId: 'anotherCompany'
            })

            await expect(getJobApplications(mockCompanyId, mockJobId, 1, 20)).rejects.toThrow(
                new CustomError('Job not found', 404)
            )
        })
    })

    describe('getCompanyApplicationById', () => {
        it('should return application and candidate profile details if company owns job', async () => {
            const mockAppObj = {
                ...mockApplication,
                jobId: mockJobId,
                seekerId: mockSeekerId,
                populate: jest.fn().mockResolvedValue(this),
                toJSON: () => mockApplication
            }
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockAppObj)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(seekerProfileRepository.findByUserId as jest.Mock).mockResolvedValue({ skills: ['JS'] })
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue({ _id: mockResumeId, originalFileName: 'cv.pdf', mimeType: 'application/pdf', storageKey: 'someKey' })

            const result = await getCompanyApplicationById(mockCompanyId, mockAppId)
            expect(result.application).toEqual(mockAppObj)
            expect(result.seekerProfile).toEqual({ skills: ['JS'] })
        })
    })

    describe('updateApplicationStatus', () => {
        it('should transition status successfully along valid path', async () => {
            const mockSave = jest.fn()
            const mockAppObj = {
                ...mockApplication,
                status: EApplicationStatus.SUBMITTED,
                save: mockSave
            }
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockAppObj)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)

            const result = await updateApplicationStatus(mockCompanyId, mockAppId, EApplicationStatus.UNDER_REVIEW)
            expect(result.status).toBe(EApplicationStatus.UNDER_REVIEW)
            expect(mockSave).toHaveBeenCalled()
        })

        it('should throw 400 if transition path is invalid', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue({
                ...mockApplication,
                status: EApplicationStatus.REJECTED
            })
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)

            await expect(
                updateApplicationStatus(mockCompanyId, mockAppId, EApplicationStatus.SHORTLISTED)
            ).rejects.toThrow(
                new CustomError('Invalid status transition from REJECTED to SHORTLISTED', 400)
            )
        })

        it('should throw 400 if company attempts to transition to WITHDRAWN', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue({
                ...mockApplication,
                status: EApplicationStatus.SUBMITTED
            })
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)

            await expect(
                updateApplicationStatus(mockCompanyId, mockAppId, EApplicationStatus.WITHDRAWN)
            ).rejects.toThrow(
                new CustomError('WITHDRAWN status is seeker-controlled', 400)
            )
        })
    })
})
