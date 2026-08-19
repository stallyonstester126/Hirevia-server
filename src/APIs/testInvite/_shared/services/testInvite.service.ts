import crypto from 'crypto'
import testInviteRepository from '../repo/testInvite.repository'
import jobRepository from '../../../job/_shared/repo/job.repository'
import userQuery from '../../../user/_shared/repo/user.repository'
import companyProfileRepository from '../../../company/_shared/repo/companyProfile.repository'
import applicationRepository from '../../../application/_shared/repo/application.repository'
import CVAnalysisProvider from '../../../../services/ai/groq.provider'
import * as interviewInviteService from '../../../interviewInvite/_shared/services/interviewInvite.service'
import emailService from '../../../../services/email'
import { getInterviewInviteEmailTemplate } from '../../../../services/emailTemplates'
import { CustomError } from '../../../../utils/errors'
import config from '../../../../config/config'
import { ITestInvite, ITestResponse } from '../types/testInvite.interface'
import { EApplicationStatus } from '../../../../constant/applications'
import logger from '../../../../handlers/logger'

export const generateTestInvite = async (
    applicationId: string,
    jobId: string,
    seekerId: string
) => {
    // Check if an invite already exists for this application
    const existing = await testInviteRepository.findByApplicationId(applicationId)
    if (existing) {
        return existing
    }

    // Generate cryptographically secure 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex')
    const expiryDays = config.TEST_INVITE_EXPIRY_DAYS || 7
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

    const payload: ITestInvite = {
        applicationId,
        jobId,
        seekerId,
        token,
        status: 'PENDING',
        startedAt: null,
        completedAt: null,
        expiresAt,
        responses: [],
        assessmentScore: null,
        assessmentFeedback: null
    }

    return testInviteRepository.create(payload)
}

export const getPublicTestByToken = async (token: string) => {
    if (!token || typeof token !== 'string') {
        throw new CustomError('Invalid or missing assessment token', 400)
    }

    const testInvite = await testInviteRepository.findByToken(token)
    if (!testInvite) {
        throw new CustomError('Assessment invite not found or invalid link', 404)
    }

    // Check expiry
    const now = new Date()
    if (testInvite.expiresAt < now && testInvite.status !== 'COMPLETED') {
        if (testInvite.status !== 'EXPIRED') {
            testInvite.status = 'EXPIRED'
            await testInvite.save()
        }
        throw new CustomError('This assessment invite link has expired', 410)
    }

    // Fetch minimal safe display context
    const job = await jobRepository.findById(testInvite.jobId.toString())
    const seeker = await userQuery.findUserById(testInvite.seekerId.toString())

    let companyName = 'Hirevia Employer'
    if (job && job.companyId) {
        const companyIdStr = typeof job.companyId === 'object' && '_id' in job.companyId
            ? (job.companyId as any)._id.toString()
            : `${job.companyId}`
        const companyProfile = await companyProfileRepository.findByUserId(companyIdStr)
        if (companyProfile && (companyProfile.companyName || (companyProfile as any).name)) {
            companyName = companyProfile.companyName || (companyProfile as any).name
        } else if (typeof job.companyId === 'object' && 'name' in job.companyId) {
            companyName = (job.companyId as any).name
        }
    }

    const candidateFirstName = seeker?.name ? seeker.name.split(' ')[0] : 'Candidate'

    return {
        jobTitle: job?.title || 'Open Role',
        companyName,
        candidateFirstName,
        status: testInvite.status,
        expiresAt: testInvite.expiresAt
    }
}

export const startPublicTestByToken = async (token: string) => {
    if (!token || typeof token !== 'string') {
        throw new CustomError('Invalid or missing assessment token', 400)
    }

    const testInvite = await testInviteRepository.findByToken(token)
    if (!testInvite) {
        throw new CustomError('Assessment invite not found or invalid link', 404)
    }

    const now = new Date()
    if (testInvite.expiresAt < now) {
        if (testInvite.status !== 'COMPLETED') {
            testInvite.status = 'EXPIRED'
            await testInvite.save()
        }
        throw new CustomError('This assessment invite link has expired', 410)
    }

    if (testInvite.status === 'COMPLETED') {
        return {
            status: testInvite.status,
            startedAt: testInvite.startedAt
        }
    }

    if (testInvite.status === 'PENDING') {
        testInvite.status = 'STARTED'
        testInvite.startedAt = now
        await testInvite.save()
    }

    return {
        status: testInvite.status,
        startedAt: testInvite.startedAt
    }
}

export const completePublicTestByToken = async (
    token: string,
    rawResponses?: Array<{ question: string; answer: string }>
) => {
    if (!token || typeof token !== 'string') {
        throw new CustomError('Invalid or missing assessment token', 400)
    }

    const testInvite = await testInviteRepository.findByToken(token)
    if (!testInvite) {
        throw new CustomError('Assessment invite not found or invalid link', 404)
    }

    const now = new Date()
    if (testInvite.expiresAt < now && testInvite.status !== 'COMPLETED') {
        testInvite.status = 'EXPIRED'
        await testInvite.save()
        throw new CustomError('This assessment invite link has expired', 410)
    }

    // Idempotency: If already completed, safely return existing state
    if (testInvite.status === 'COMPLETED') {
        return {
            status: testInvite.status,
            completedAt: testInvite.completedAt,
            assessmentScore: testInvite.assessmentScore,
            assessmentFeedback: testInvite.assessmentFeedback
        }
    }

    // Process responses
    const formattedResponses: ITestResponse[] = Array.isArray(rawResponses) && rawResponses.length > 0
        ? rawResponses.map((r) => ({
              question: String(r.question || '').trim(),
              answer: String(r.answer || '').trim()
          }))
        : []

    testInvite.status = 'COMPLETED'
    testInvite.completedAt = now
    testInvite.responses = formattedResponses

    // Auto-transition application status: SHORTLISTED -> INTERVIEW
    try {
        const application = await applicationRepository.findById(testInvite.applicationId.toString())
        if (application && application.status === EApplicationStatus.SHORTLISTED) {
            application.status = EApplicationStatus.INTERVIEW
            application.advancedBy = 'SYSTEM_AI'
            await application.save()
            logger.info(`[TestInvite] Application ${testInvite.applicationId} automatically advanced SHORTLISTED -> INTERVIEW upon assessment submission`)

            // Auto-create InterviewInvite for the voice interview stage
            try {
                const interviewInvite = await interviewInviteService.generateInterviewInvite(
                    (application as any)._id.toString(),
                    testInvite.jobId.toString(),
                    testInvite.seekerId.toString()
                )

                // Dispatch Voice Interview Invite Email
                const seeker = await userQuery.findUserById(testInvite.seekerId.toString())
                const job = await jobRepository.findById(testInvite.jobId.toString())
                if (seeker && seeker.email && interviewInvite) {
                    let companyName = 'Hirevia Employer'
                    if (job && job.companyId) {
                        const companyIdStr = typeof job.companyId === 'object' && '_id' in job.companyId
                            ? (job.companyId as any)._id.toString()
                            : `${job.companyId}`
                        const companyProfile = await companyProfileRepository.findByUserId(companyIdStr)
                        if (companyProfile && (companyProfile.companyName || (companyProfile as any).name)) {
                            companyName = companyProfile.companyName || (companyProfile as any).name
                        }
                    }

                    const frontendBase = config.FRONTEND_URL || (config.CLIENT_URL ? config.CLIENT_URL.split(',')[0].trim() : 'http://localhost:3002')
                    const interviewUrl = `${frontendBase}/interview/${interviewInvite.token}`
                    const candidateName = seeker.name || 'Candidate'
                    const jobTitle = job?.title || 'Open Role'

                    const emailContent = getInterviewInviteEmailTemplate({
                        candidateName,
                        jobTitle,
                        companyName,
                        interviewUrl,
                        expiresAt: interviewInvite.expiresAt
                    })

                    await emailService.sendEmail(
                        [seeker.email],
                        `Invitation to AI Voice Interview: ${jobTitle} at ${companyName}`,
                        emailContent.text,
                        emailContent.html
                    )
                    logger.info(`[TestInvite] AI Voice Interview invite email successfully sent to ${seeker.email}`)
                }
            } catch (inviteErr) {
                logger.error(`[TestInvite] Failed to create or email interview invite for application ${testInvite.applicationId}:`, { meta: inviteErr })
            }
        }
    } catch (err) {
        logger.error(`[TestInvite] Failed to update application status for ${testInvite.applicationId}:`, { meta: err })
    }

    // AI Assessment Grading with Groq
    if (formattedResponses.length > 0) {
        try {
            const job = await jobRepository.findById(testInvite.jobId.toString())
            const jobDetails = job
                ? `Job Title: ${job.title}\nDescription: ${job.description}\nRequirements: ${(job.requirements || []).join(', ')}`
                : 'Engineering Role'

            const gradingResult = await CVAnalysisProvider.gradeAssessment(jobDetails, formattedResponses)
            if (!gradingResult.unavailable && typeof gradingResult.score === 'number') {
                testInvite.assessmentScore = gradingResult.score
                testInvite.assessmentFeedback = gradingResult.feedback
            } else {
                testInvite.assessmentScore = null
                testInvite.assessmentFeedback = null
            }
        } catch (gradingErr) {
            logger.error(`[TestInvite] AI grading error for token ${token}:`, { meta: gradingErr })
            testInvite.assessmentScore = null
            testInvite.assessmentFeedback = null
        }
    }

    await testInvite.save()

    return {
        status: testInvite.status,
        completedAt: testInvite.completedAt,
        assessmentScore: testInvite.assessmentScore,
        assessmentFeedback: testInvite.assessmentFeedback
    }
}

export const getTestInviteByApplicationId = async (applicationId: string) => {
    const invite = await testInviteRepository.findByApplicationId(applicationId)
    if (!invite) return null

    // Check expiry
    if (invite.expiresAt < new Date() && invite.status !== 'COMPLETED' && invite.status !== 'EXPIRED') {
        invite.status = 'EXPIRED'
        await invite.save()
    }

    return typeof invite.toObject === 'function' ? invite.toObject() : invite
}
