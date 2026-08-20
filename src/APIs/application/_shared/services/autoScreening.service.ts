import applicationRepository from '../repo/application.repository'
import jobRepository from '../../../job/_shared/repo/job.repository'
import resumeRepository from '../../../seeker/_shared/repo/resume.repository'
import seekerProfileRepository from '../../../seeker/_shared/repo/seekerProfile.repository'
import cvAnalysisRepository from '../../../seeker/_shared/repo/cvAnalysis.repository'
import jobMatchScoreRepository from '../repo/jobMatchScore.repository'
import userQuery from '../../../user/_shared/repo/user.repository'
import companyProfileRepository from '../../../company/_shared/repo/companyProfile.repository'
import StorageService from '../../../../services/storage'
import extractText from '../../../../utils/textExtractor'
import CVAnalysisProvider from '../../../../services/ai/groq.provider'
import emailService from '../../../../services/email'
import { getTestInviteEmailTemplate } from '../../../../services/emailTemplates'
import { generateTestInvite } from '../../../testInvite/_shared/services/testInvite.service'
import { EApplicationStatus } from '../../../../constant/applications'
import config from '../../../../config/config'
import logger from '../../../../handlers/logger'
import { ICVAnalysis } from '../../../seeker/_shared/types/cvAnalysis.interface'

export const processAutoScreening = async (applicationId: string): Promise<void> => {
    const application = await applicationRepository.findById(applicationId)
    if (!application) {
        logger.warn(`[AutoScreening] Application ${applicationId} not found`)
        return
    }

    // Idempotency check: only process if status is PENDING and autoScreeningStatus is not COMPLETE / PROCESSING
    if (application.autoScreeningStatus === 'COMPLETE' || application.autoScreeningStatus === 'PROCESSING') {
        logger.info(`[AutoScreening] Application ${applicationId} already processed or in progress (status: ${application.autoScreeningStatus})`)
        return
    }

    // Set autoScreeningStatus to PROCESSING
    application.autoScreeningStatus = 'PROCESSING'
    await application.save()

    try {
        if (!application.resumeId) {
            application.autoScreeningStatus = 'SKIPPED'
            await application.save()
            return
        }

        const resume = await resumeRepository.findById(application.resumeId.toString())
        if (!resume) {
            application.autoScreeningStatus = 'SKIPPED'
            await application.save()
            return
        }

        const job = await jobRepository.findById(application.jobId.toString())
        if (!job) {
            application.autoScreeningStatus = 'SKIPPED'
            await application.save()
            return
        }

        const resumeIdStr = (resume as any)._id ? (resume as any)._id.toString() : `${resume._id}`
        const jobIdStr = (job as any)._id ? (job as any)._id.toString() : `${job._id}`
        const seekerIdStr = (application as any).seekerId ? (application as any).seekerId.toString() : `${application.seekerId}`

        // 1. Extract resume text with resilient fallback hierarchy
        let rawText = (resume as any).extractedText || ''
        if (!rawText) {
            try {
                const fileBuffer = await StorageService.get(resume.storageKey, 'resumes')
                rawText = await extractText(fileBuffer, resume.fileExtension)
            } catch (storageErr) {
                logger.warn(`[AutoScreening] Storage file read failed for resume ${resumeIdStr}: ${storageErr}`)
                if ((resume as any).fileData) {
                    try {
                        const fileBuffer = Buffer.from((resume as any).fileData, 'base64')
                        rawText = await extractText(fileBuffer, resume.fileExtension)
                    } catch (decodeErr) {
                        logger.warn(`[AutoScreening] Base64 fallback extraction failed: ${decodeErr}`)
                    }
                }
            }
        }

        // If rawText is still empty (e.g. legacy upload on wiped disk), synthesize from candidate profile as final fallback
        if (!rawText) {
            try {
                const seekerProfile = await seekerProfileRepository.findByUserId(seekerIdStr)
                if (seekerProfile) {
                    const skillsList = (seekerProfile.skills || []).join(', ')
                    const expList = (seekerProfile.experience || []).map((e: any) => `${e.position || ''} at ${e.company || ''} (${e.description || ''})`).join('\n')
                    const eduList = (seekerProfile.education || []).map((e: any) => `${e.degree || ''} from ${e.institution || ''}`).join('\n')
                    rawText = `Candidate Profile:\nHeadline: ${seekerProfile.headline || ''}\nBio: ${seekerProfile.bio || ''}\nSkills: ${skillsList}\nExperience:\n${expList}\nEducation:\n${eduList}`
                }
            } catch (profileErr) {
                logger.warn(`[AutoScreening] Seeker profile fallback lookup failed for ${seekerIdStr}:`, { meta: profileErr })
            }
        }

        if (!rawText) {
            rawText = `Applicant for ${job.title} - Candidate ID: ${seekerIdStr}`
        }

        // 2. Ensure CV Analysis is present
        let analysis = await cvAnalysisRepository.findByResumeId(resumeIdStr)
        if (!analysis || analysis.status !== 'COMPLETE') {
            const parsedAnalysis = await CVAnalysisProvider.analyze(rawText)
            if (!parsedAnalysis.unavailable) {
                const analysisPayload: Partial<ICVAnalysis> = {
                    resumeId: resumeIdStr,
                    seekerId: seekerIdStr,
                    extractedSkills: parsedAnalysis.extractedSkills,
                    experienceSummary: parsedAnalysis.experienceSummary,
                    educationSummary: parsedAnalysis.educationSummary,
                    estimatedExperienceLevel: parsedAnalysis.estimatedExperienceLevel,
                    suggestions: parsedAnalysis.suggestions,
                    status: 'COMPLETE'
                }
                await cvAnalysisRepository.update(resumeIdStr, analysisPayload)
            }
        }

        // 3. Compute Job Match Score
        const jobDetails = `Job Title: ${job.title}\nDescription: ${job.description}\nRequirements: ${(job.requirements || []).join(', ')}`
        const matchResult = await CVAnalysisProvider.matchJob(rawText, jobDetails)

        if (matchResult.unavailable) {
            logger.warn(`[AutoScreening] AI matching unavailable for application ${applicationId}`)
            application.autoScreeningStatus = 'FAILED'
            await application.save()
            return
        }

        // Save match score record
        await jobMatchScoreRepository.update(applicationId, {
            applicationId,
            resumeId: resumeIdStr,
            jobId: jobIdStr,
            score: matchResult.score,
            rationale: matchResult.rationale,
            generatedAt: new Date()
        })

        const threshold = config.AUTO_SHORTLIST_THRESHOLD !== undefined ? config.AUTO_SHORTLIST_THRESHOLD : 70
        const isQualified = matchResult.score >= threshold

        application.autoScreeningScore = matchResult.score
        application.autoScreeningRationale = matchResult.rationale
        application.autoScreeningStatus = 'COMPLETE'

        if (isQualified && application.status === EApplicationStatus.SUBMITTED) {
            // Sequential state transitions to preserve state machine integrity
            // Step 1: SUBMITTED -> UNDER_REVIEW
            application.status = EApplicationStatus.UNDER_REVIEW
            await application.save()

            // Step 2: UNDER_REVIEW -> SHORTLISTED
            application.status = EApplicationStatus.SHORTLISTED
            application.advancedBy = 'SYSTEM_AI'
            await application.save()

            // Generate TestInvite
            const testInvite = await generateTestInvite(
                applicationId,
                jobIdStr,
                seekerIdStr
            )

            // Send candidate test invite email
            try {
                const seeker = await userQuery.findUserById(application.seekerId.toString())
                if (seeker && seeker.email) {
                    let companyName = 'Hirevia Employer'
                    if (job.companyId) {
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

                    const clientOrigins = config.CLIENT_URL
                        ? config.CLIENT_URL.split(',').map((u) => u.trim()).filter(Boolean)
                        : []
                    const frontendBaseUrl =
                        (clientOrigins.length > 0 ? clientOrigins[0] : '') ||
                        config.FRONTEND_URL ||
                        'http://localhost:3002'
                    const testUrl = `${frontendBaseUrl}/test/${testInvite.token}`
                    const emailTemplate = getTestInviteEmailTemplate({
                        candidateName: seeker.name || 'Candidate',
                        jobTitle: job.title,
                        companyName,
                        testUrl,
                        expiresAt: testInvite.expiresAt
                    })

                    console.log(`\n======================================================`)
                    console.log(`[AutoScreening] Shortlisted Candidate: ${seeker.email} (Score: ${matchResult.score})`)
                    console.log(`[AutoScreening] Test Invite URL: ${testUrl}`)
                    console.log(`======================================================\n`)

                    emailService.sendEmail(
                        [seeker.email],
                        `Invitation to Assessment: ${job.title} at ${companyName}`,
                        emailTemplate.text,
                        emailTemplate.html
                    ).catch((err) => {
                        logger.error('[AutoScreening] Failed to send test invite email:', { meta: err })
                    })
                }
            } catch (emailErr) {
                logger.error('[AutoScreening] Candidate notification error:', { meta: emailErr })
            }
        } else {
            // Below threshold or already in another state: save without auto-shortlist
            await application.save()
        }

        logger.info(`[AutoScreening] Completed for application ${applicationId} (Score: ${matchResult.score}, Qualified: ${isQualified})`)
    } catch (err: any) {
        logger.error(`[AutoScreening] Error processing application ${applicationId}:`, { meta: err })
        application.autoScreeningStatus = 'FAILED'
        await application.save()
    }
}
