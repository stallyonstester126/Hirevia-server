import crypto from 'crypto'
import interviewInviteRepository from '../repo/interviewInvite.repository'
import jobRepository from '../../../job/_shared/repo/job.repository'
import userQuery from '../../../user/_shared/repo/user.repository'
import companyProfileRepository from '../../../company/_shared/repo/companyProfile.repository'
import applicationRepository from '../../../application/_shared/repo/application.repository'
import seekerProfileRepository from '../../../seeker/_shared/repo/seekerProfile.repository'
import cvAnalysisRepository from '../../../seeker/_shared/repo/cvAnalysis.repository'
import CVAnalysisProvider from '../../../../services/ai/groq.provider'
import { CustomError } from '../../../../utils/errors'
import config from '../../../../config/config'
import { IInterviewInvite } from '../types/interviewInvite.interface'
import logger from '../../../../handlers/logger'

export const generateInterviewInvite = async (
    applicationId: string,
    jobId: string,
    seekerId: string
) => {
    // Check if an invite already exists for this application
    const existing = await interviewInviteRepository.findByApplicationId(applicationId)
    if (existing) {
        return existing
    }

    // Generate cryptographically secure 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex')
    const expiryDays = config.TEST_INVITE_EXPIRY_DAYS || 7
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

    const payload: IInterviewInvite = {
        applicationId,
        jobId,
        seekerId,
        token,
        status: 'PENDING',
        vapiCallId: null,
        transcript: null,
        interviewScore: null,
        interviewFeedback: null,
        startedAt: null,
        completedAt: null,
        expiresAt
    }

    return interviewInviteRepository.create(payload)
}

export const getPublicInterviewByToken = async (token: string) => {
    if (!token || typeof token !== 'string') {
        throw new CustomError('Invalid or missing interview token', 400)
    }

    const invite = await interviewInviteRepository.findByToken(token)
    if (!invite) {
        throw new CustomError('Interview invite not found or invalid link', 404)
    }

    // Check expiry
    const now = new Date()
    if (invite.expiresAt < now && invite.status !== 'COMPLETED') {
        if (invite.status !== 'EXPIRED') {
            invite.status = 'EXPIRED'
            await invite.save()
        }
        throw new CustomError('This interview invite link has expired', 410)
    }

    // Fetch minimal safe display and Vapi variable context
    const job = await jobRepository.findById(invite.jobId.toString())
    const seeker = await userQuery.findUserById(invite.seekerId.toString())
    const application = await applicationRepository.findById(invite.applicationId.toString())

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

    const candidateName = seeker?.name || 'Candidate'

    // Fetch CV Analysis if available
    let candidateSkills = 'Software Engineering, Communication, Problem Solving'
    let experienceLevel = job?.experienceLevel || 'MID'
    let experienceSummary = 'Experienced technical professional'

    if (application && application.resumeId) {
        const resumeIdStr = typeof application.resumeId === 'object' && '_id' in application.resumeId
            ? (application.resumeId as any)._id.toString()
            : `${application.resumeId}`
        const cvAnalysis = await cvAnalysisRepository.findByResumeId(resumeIdStr)
        if (cvAnalysis) {
            if (cvAnalysis.extractedSkills && cvAnalysis.extractedSkills.length > 0) {
                candidateSkills = cvAnalysis.extractedSkills.join(', ')
            }
            if (cvAnalysis.estimatedExperienceLevel) {
                experienceLevel = cvAnalysis.estimatedExperienceLevel
            }
            if (cvAnalysis.experienceSummary) {
                experienceSummary = cvAnalysis.experienceSummary
            }
        }
    }

    // Fallback to seeker profile if cv analysis not present
    if (candidateSkills === 'Software Engineering, Communication, Problem Solving') {
        const seekerProfile = await seekerProfileRepository.findByUserId(invite.seekerId.toString())
        if (seekerProfile && seekerProfile.skills && seekerProfile.skills.length > 0) {
            candidateSkills = seekerProfile.skills.join(', ')
        }
        if (seekerProfile && (seekerProfile.bio || seekerProfile.headline)) {
            experienceSummary = seekerProfile.bio || seekerProfile.headline || experienceSummary
        }
    }

    const jobRequirements = job && job.requirements && job.requirements.length > 0
        ? job.requirements.join(', ')
        : 'Demonstrated experience in core domain requirements'

    return {
        candidateName,
        jobTitle: job?.title || 'Open Role',
        companyName,
        jobRequirements,
        candidateSkills,
        experienceLevel,
        experienceSummary,
        status: invite.status,
        expiresAt: invite.expiresAt,
        applicationId: invite.applicationId.toString(),
        token: invite.token
    }
}

export const startPublicInterviewByToken = async (token: string, vapiCallId?: string) => {
    if (!token || typeof token !== 'string') {
        throw new CustomError('Invalid or missing interview token', 400)
    }

    const invite = await interviewInviteRepository.findByToken(token)
    if (!invite) {
        throw new CustomError('Interview invite not found or invalid link', 404)
    }

    const now = new Date()
    if (invite.expiresAt < now) {
        if (invite.status !== 'COMPLETED') {
            invite.status = 'EXPIRED'
            await invite.save()
        }
        throw new CustomError('This interview invite link has expired', 410)
    }

    if (invite.status === 'COMPLETED') {
        return {
            status: invite.status,
            startedAt: invite.startedAt
        }
    }

    if (invite.status === 'PENDING') {
        invite.status = 'STARTED'
        invite.startedAt = now
        if (vapiCallId) {
            invite.vapiCallId = vapiCallId
        }
        await invite.save()
    } else if (vapiCallId && !invite.vapiCallId) {
        invite.vapiCallId = vapiCallId
        await invite.save()
    }

    return {
        status: invite.status,
        startedAt: invite.startedAt
    }
}

export interface IFinalizeInterviewOptions {
    vapiCallId?: string
    endedReason?: string
    tabSwitchCount?: number
    tabSwitchDuration?: number
}

export const completeInterviewSession = async (
    identifier: { token?: string; applicationId?: string; vapiCallId?: string },
    transcript?: string | null,
    options?: IFinalizeInterviewOptions
) => {
    let invite = null

    if (identifier.token) {
        invite = await interviewInviteRepository.findByToken(identifier.token)
    }
    if (!invite && identifier.applicationId) {
        invite = await interviewInviteRepository.findByApplicationId(identifier.applicationId)
    }
    if (!invite && identifier.vapiCallId) {
        invite = await interviewInviteRepository.findByVapiCallId(identifier.vapiCallId)
    }

    if (!invite) {
        logger.warn(`[InterviewSession] No matching InterviewInvite found for identifier: ${JSON.stringify(identifier)}`)
        return null
    }

    const { vapiCallId, endedReason, tabSwitchCount, tabSwitchDuration } = options || {}

    // Idempotency: If already completed, enrich missing metadata without re-grading or erroring
    if (invite.status === 'COMPLETED') {
        let changed = false
        if (endedReason && !invite.endedReason) {
            invite.endedReason = endedReason
            changed = true
        }
        if (typeof tabSwitchCount === 'number' && (invite.tabSwitchCount === undefined || invite.tabSwitchCount === 0)) {
            invite.tabSwitchCount = tabSwitchCount
            changed = true
        }
        if (typeof tabSwitchDuration === 'number' && (invite.tabSwitchDuration === undefined || invite.tabSwitchDuration === 0)) {
            invite.tabSwitchDuration = tabSwitchDuration
            changed = true
        }
        if (vapiCallId && !invite.vapiCallId) {
            invite.vapiCallId = vapiCallId
            changed = true
        }
        // If transcript was missing before but is now provided, save and grade
        if ((!invite.transcript || invite.transcript.trim().length === 0) && transcript && transcript.trim().length > 0) {
            invite.transcript = transcript
            try {
                const job = await jobRepository.findById(invite.jobId.toString())
                const jobDetails = job
                    ? `Job Title: ${job.title}\nDescription: ${job.description}\nRequirements: ${(job.requirements || []).join(', ')}`
                    : 'Engineering Role'

                const gradingResult = await CVAnalysisProvider.gradeInterviewTranscript(jobDetails, transcript)
                if (!gradingResult.unavailable && typeof gradingResult.score === 'number') {
                    invite.interviewScore = gradingResult.score
                    invite.interviewFeedback = gradingResult.feedback
                }
            } catch (gradingErr) {
                logger.error(`[InterviewSession] AI transcript grading error for invite ${invite._id}:`, { meta: gradingErr })
            }
            changed = true
        }

        if (changed) {
            await invite.save()
        }

        logger.info(`[InterviewSession] InterviewInvite ${invite._id} already COMPLETED, returning idempotent result`)
        return {
            status: invite.status,
            completedAt: invite.completedAt,
            interviewScore: invite.interviewScore,
            interviewFeedback: invite.interviewFeedback,
            endedReason: invite.endedReason,
            tabSwitchCount: invite.tabSwitchCount,
            tabSwitchDuration: invite.tabSwitchDuration
        }
    }

    const now = new Date()
    invite.status = 'COMPLETED'
    invite.completedAt = now
    invite.transcript = transcript || ''
    if (vapiCallId) {
        invite.vapiCallId = vapiCallId
    }
    if (endedReason) {
        invite.endedReason = endedReason
    }
    if (typeof tabSwitchCount === 'number') {
        invite.tabSwitchCount = tabSwitchCount
    }
    if (typeof tabSwitchDuration === 'number') {
        invite.tabSwitchDuration = tabSwitchDuration
    }

    // AI Transcript Grading with Groq
    if (transcript && transcript.trim().length > 0) {
        try {
            const job = await jobRepository.findById(invite.jobId.toString())
            const jobDetails = job
                ? `Job Title: ${job.title}\nDescription: ${job.description}\nRequirements: ${(job.requirements || []).join(', ')}`
                : 'Engineering Role'

            const gradingResult = await CVAnalysisProvider.gradeInterviewTranscript(jobDetails, transcript)
            if (!gradingResult.unavailable && typeof gradingResult.score === 'number') {
                invite.interviewScore = gradingResult.score
                invite.interviewFeedback = gradingResult.feedback
            } else {
                invite.interviewScore = null
                invite.interviewFeedback = null
            }
        } catch (gradingErr) {
            logger.error(`[InterviewSession] AI transcript grading error for invite ${invite._id}:`, { meta: gradingErr })
            invite.interviewScore = null
            invite.interviewFeedback = null
        }
    } else {
        invite.interviewScore = null
        invite.interviewFeedback = null
    }

    await invite.save()
    logger.info(`[InterviewSession] Successfully saved transcript and graded InterviewInvite ${invite._id}`)

    return {
        status: invite.status,
        completedAt: invite.completedAt,
        interviewScore: invite.interviewScore,
        interviewFeedback: invite.interviewFeedback,
        endedReason: invite.endedReason,
        tabSwitchCount: invite.tabSwitchCount,
        tabSwitchDuration: invite.tabSwitchDuration
    }
}

export const completeInterviewByWebhook = async (
    identifier: { token?: string; applicationId?: string; vapiCallId?: string },
    transcript: string,
    vapiCallId?: string,
    endedReason?: string
) => {
    return completeInterviewSession(identifier, transcript, { vapiCallId, endedReason })
}

export const finalizePublicInterviewByToken = async (
    token: string,
    payload: {
        transcript?: string
        vapiCallId?: string
        endedReason?: string
        tabSwitchCount?: number
        tabSwitchDuration?: number
    }
) => {
    if (!token || typeof token !== 'string') {
        throw new CustomError('Invalid or missing interview token', 400)
    }

    const result = await completeInterviewSession(
        { token },
        payload.transcript,
        {
            vapiCallId: payload.vapiCallId,
            endedReason: payload.endedReason || 'CALL_ENDED',
            tabSwitchCount: payload.tabSwitchCount,
            tabSwitchDuration: payload.tabSwitchDuration
        }
    )

    if (!result) {
        throw new CustomError('Interview invite not found or invalid link', 404)
    }

    return result
}

export const getInterviewInviteByApplicationId = async (applicationId: string) => {
    const invite = await interviewInviteRepository.findByApplicationId(applicationId)
    if (!invite) return null

    // Check expiry
    if (invite.expiresAt < new Date() && invite.status !== 'COMPLETED' && invite.status !== 'EXPIRED') {
        invite.status = 'EXPIRED'
        await invite.save()
    }

    return typeof invite.toObject === 'function' ? invite.toObject() : invite
}
