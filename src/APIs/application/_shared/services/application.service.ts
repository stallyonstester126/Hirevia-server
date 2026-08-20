import applicationRepository from '../repo/application.repository'
import jobRepository from '../../../job/_shared/repo/job.repository'
import seekerProfileRepository from '../../../seeker/_shared/repo/seekerProfile.repository'
import resumeRepository from '../../../seeker/_shared/repo/resume.repository'
import { IApplication } from '../types/application.interface'
import { CustomError } from '../../../../utils/errors'
import { EApplicationStatus } from '../../../../constant/applications'
import { EJobStatus } from '../../../../constant/jobs'
import StorageService from '../../../../services/storage'
import cvAnalysisRepository from '../../../seeker/_shared/repo/cvAnalysis.repository'
import jobMatchScoreRepository from '../repo/jobMatchScore.repository'
import extractText from '../../../../utils/textExtractor'
import CVAnalysisProvider from '../../../../services/ai/groq.provider'
import { processAutoScreening } from './autoScreening.service'
import { getTestInviteByApplicationId } from '../../../testInvite/_shared/services/testInvite.service'
import { getInterviewInviteByApplicationId } from '../../../interviewInvite/_shared/services/interviewInvite.service'
import logger from '../../../../handlers/logger'

export const applyToJob = async (seekerId: string, jobId: string, resumeId: string, coverLetter?: string) => {
    if (!resumeId) {
        throw new CustomError('Resume is required to apply', 400)
    }

    const resume = await resumeRepository.findById(resumeId)
    if (!resume || resume.seekerId.toString() !== seekerId.toString()) {
        throw new CustomError('You are not authorized to use this resume', 403)
    }

    const job = await jobRepository.findById(jobId)
    if (!job) {
        throw new CustomError('Job not found', 404)
    }

    if (job.status !== EJobStatus.PUBLISHED) {
        throw new CustomError('Only published jobs accept applications', 400)
    }

    const existing = await applicationRepository.findByJobAndSeeker(jobId, seekerId)
    if (existing) {
        throw new CustomError('You have already applied for this job', 409)
    }

    const payload: IApplication = {
        jobId,
        seekerId,
        resumeId,
        coverLetter,
        status: EApplicationStatus.SUBMITTED,
        appliedAt: new Date(),
        autoScreeningStatus: 'PENDING'
    }

    const application = await applicationRepository.create(payload)

    // In-process non-blocking asynchronous auto-screening trigger
    setImmediate(() => {
        const appId = (application as any)._id ? (application as any)._id.toString() : `${application._id}`
        processAutoScreening(appId).catch((err) => {
            logger.error(`[AutoScreening] Uncaught error during background screening:`, { meta: err })
        })
    })

    return application
}


export const checkSeekerJobApplication = async (seekerId: string, jobId: string) => {
    const application = await applicationRepository.findByJobAndSeeker(jobId, seekerId)
    return {
        hasApplied: !!application,
        application: application ? {
            _id: application._id,
            status: application.status,
            appliedAt: application.appliedAt
        } : null
    }
}

export const getSeekerApplications = async (seekerId: string, page: number, limit: number) => {
    const applications = await applicationRepository.findSeekerApps(seekerId, page, limit)
    const total = await applicationRepository.countSeekerApps(seekerId)

    return {
        applications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export const getSeekerApplicationById = async (seekerId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application || application.seekerId.toString() !== seekerId.toString()) {
        throw new CustomError('Application not found', 404)
    }

    // Populate job details and resume details
    await application.populate([
        {
            path: 'jobId',
            select: 'title companyId location workplaceType employmentType',
            populate: {
                path: 'companyId',
                select: 'name email'
            }
        },
        {
            path: 'resumeId',
            select: 'originalFileName version isActive createdAt'
        }
    ])

    return typeof (application as any).toObject === 'function' ? (application as any).toObject() : application
}

export const withdrawApplication = async (seekerId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application || application.seekerId.toString() !== seekerId.toString()) {
        throw new CustomError('Application not found', 404)
    }

    const unwithdrawableStates = [
        EApplicationStatus.HIRED,
        EApplicationStatus.REJECTED,
        EApplicationStatus.WITHDRAWN
    ]

    if (unwithdrawableStates.includes(application.status)) {
        throw new CustomError('Application cannot be withdrawn in its current state', 400)
    }

    application.status = EApplicationStatus.WITHDRAWN
    await application.save()
    return application
}

export const getJobApplications = async (
    companyId: string,
    jobId: string,
    page: number,
    limit: number,
    status?: EApplicationStatus
) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    const filters: any = {}
    if (status) {
        filters.status = status
    }

    const applications = await applicationRepository.findJobApps(jobId, filters, page, limit)
    const total = await applicationRepository.countJobApps(jobId, filters)

    return {
        applications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export const getCompanyApplicationById = async (companyId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const job = await jobRepository.findById(application.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    // Populate user name and email, and resume details
    await application.populate([
        {
            path: 'seekerId',
            select: 'name email'
        },
        {
            path: 'resumeId',
            select: 'originalFileName version isActive createdAt'
        }
    ])

    // Fetch candidate SeekerProfile information to merge in response
    const seekerIdStr = application.seekerId && typeof application.seekerId === 'object' && '_id' in application.seekerId
        ? (application.seekerId as any)._id.toString()
        : `${application.seekerId}`

    const seekerProfileDoc = await seekerProfileRepository.findByUserId(seekerIdStr)
    const seekerProfile = seekerProfileDoc && typeof (seekerProfileDoc as any).toObject === 'function'
        ? (seekerProfileDoc as any).toObject()
        : seekerProfileDoc

    const appObj = typeof (application as any).toObject === 'function'
        ? (application as any).toObject()
        : application

    return {
        application: appObj,
        seekerProfile,
    }
}

export const updateApplicationStatus = async (
    companyId: string,
    applicationId: string,
    newStatus: EApplicationStatus
) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const job = await jobRepository.findById(application.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    if (newStatus === EApplicationStatus.WITHDRAWN) {
        throw new CustomError('WITHDRAWN status is seeker-controlled', 400)
    }

    const validTransitions: Record<EApplicationStatus, EApplicationStatus[]> = {
        [EApplicationStatus.SUBMITTED]: [EApplicationStatus.UNDER_REVIEW, EApplicationStatus.REJECTED],
        [EApplicationStatus.UNDER_REVIEW]: [EApplicationStatus.SHORTLISTED, EApplicationStatus.REJECTED],
        [EApplicationStatus.SHORTLISTED]: [EApplicationStatus.INTERVIEW, EApplicationStatus.REJECTED],
        [EApplicationStatus.INTERVIEW]: [EApplicationStatus.HIRED, EApplicationStatus.REJECTED],
        [EApplicationStatus.HIRED]: [],
        [EApplicationStatus.REJECTED]: [],
        [EApplicationStatus.WITHDRAWN]: []
    }

    const currentStatus = application.status
    const allowed = validTransitions[currentStatus] || []
    if (!allowed.includes(newStatus)) {
        throw new CustomError(`Invalid status transition from ${currentStatus} to ${newStatus}`, 400)
    }

    application.status = newStatus
    await application.save()
    return application
}

export const getCompanyApplicationResumeFile = async (companyId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const job = await jobRepository.findById(application.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    if (!application.resumeId) {
        throw new CustomError('No resume attached to this application', 404)
    }

    const resume = await resumeRepository.findById(application.resumeId.toString())
    if (!resume) {
        throw new CustomError('Resume not found', 404)
    }

    const fileBuffer = await StorageService.get(resume.storageKey, 'resumes')

    return {
        fileBuffer,
        originalFileName: resume.originalFileName,
        mimeType: resume.mimeType
    }
}

export const getCompanyApplicationAnalysis = async (companyId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const job = await jobRepository.findById(application.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Application not found', 404)
    }

    if (!application.resumeId) {
        throw new CustomError('No resume attached to this application', 404)
    }

    const analysis = await cvAnalysisRepository.findByResumeId(application.resumeId.toString())
    const matchScore = await jobMatchScoreRepository.findByApplicationId(applicationId)

    const analysisObj = analysis ? (analysis.toObject ? analysis.toObject() : { ...analysis }) : null
    if (analysisObj) {
        delete analysisObj.rawProviderResponse
    }

    return {
        analysis: analysisObj,
        matchScore
    }
}

export const matchCompanyApplicationJob = async (companyId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const job = await jobRepository.findById(application.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Application not found', 404)
    }

    if (!application.resumeId) {
        throw new CustomError('No resume attached to this application', 404)
    }

    const resume = await resumeRepository.findById(application.resumeId.toString())
    if (!resume) {
        throw new CustomError('Resume not found', 404)
    }

    const fileBuffer = await StorageService.get(resume.storageKey, 'resumes')
    const rawText = await extractText(fileBuffer, resume.fileExtension)

    const jobDetails = `Job Title: ${job.title}\nDescription: ${job.description}\nRequirements: ${(job.requirements || []).join(', ')}`

    const parsed = await CVAnalysisProvider.matchJob(rawText, jobDetails)
    if (parsed.unavailable) {
        throw new CustomError('AI matching service is currently unavailable', 503)
    }

    const matchPayload = {
        applicationId,
        resumeId: application.resumeId.toString(),
        jobId: application.jobId.toString(),
        score: parsed.score,
        rationale: parsed.rationale,
        generatedAt: new Date()
    }

    const matchScore = await jobMatchScoreRepository.update(applicationId, matchPayload)
    return matchScore
}

export const getCompanyApplicationTestInvite = async (companyId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const job = await jobRepository.findById(application.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    const testInvite = await getTestInviteByApplicationId(applicationId)
    return testInvite
}

export const getCompanyApplicationInterviewInvite = async (companyId: string, applicationId: string) => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const job = await jobRepository.findById(application.jobId.toString())
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    const interviewInvite = await getInterviewInviteByApplicationId(applicationId)
    return interviewInvite
}


