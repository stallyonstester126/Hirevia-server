import request from 'supertest'
import mongoose from 'mongoose'
import app from '../../app'
import ApplicationModel from '../../APIs/application/_shared/models/application.model'
import TestInviteModel from '../../APIs/testInvite/_shared/models/testInvite.model'
import InterviewInviteModel from '../../APIs/interviewInvite/_shared/models/interviewInvite.model'
import JobModel from '../../APIs/job/_shared/models/job.model'
import UserModel from '../../APIs/user/_shared/models/user.model'
import ResumeModel from '../../APIs/seeker/_shared/models/resume.model'
import CVAnalysisModel from '../../APIs/seeker/_shared/models/cvAnalysis.model'
import CompanyProfileModel from '../../APIs/company/_shared/models/companyProfile.model'
import CVAnalysisProvider from '../../services/ai/groq.provider'
import emailService from '../../services/email'
import { EApplicationStatus } from '../../constant/applications'
import { EJobStatus, EEmploymentType, EExperienceLevel, EWorkplaceType, EPaymentStatus } from '../../constant/jobs'
import { EUserRoles } from '../../constant/users'
import jwt from '../../utils/jwt'
import config from '../../config/config'

describe('AI Voice Interview (Vapi) Pipeline — Phase 10', () => {
    jest.setTimeout(30000)

    let companyUser: any
    let otherCompanyUser: any
    let seekerUser: any
    let companyToken: string
    let otherCompanyToken: string
    let publishedJob: any
    let testResume: any

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DATABASE_URL as string)
        }
    }, 30000)

    beforeEach(async () => {
        jest.clearAllMocks()

        // Create primary company user
        companyUser = await UserModel.create({
            name: 'Acme Recruiter',
            email: `company_vapi_${Date.now()}_${Math.random()}@acme.com`,
            phoneNumber: { countryCode: '+1', isoCode: 'US', internationalNumber: '+15551101' },
            role: EUserRoles.COMPANY,
            password: 'hashedpassword',
            timezone: 'America/New_York',
            accountConfimation: { status: true, token: `tok_${Date.now()}`, code: '123456' },
            consent: true
        })
        companyToken = jwt.generateToken(
            { userId: companyUser._id, email: companyUser.email, role: companyUser.role },
            config.TOKENS.ACCESS.SECRET,
            3600
        )

        // Create company profile
        await CompanyProfileModel.create({
            userId: companyUser._id,
            companyName: 'Acme Innovations Inc.'
        })

        // Create secondary (other) company user for IDOR testing
        otherCompanyUser = await UserModel.create({
            name: 'Other Corp Admin',
            email: `other_company_${Date.now()}_${Math.random()}@other.com`,
            phoneNumber: { countryCode: '+1', isoCode: 'US', internationalNumber: '+15551102' },
            role: EUserRoles.COMPANY,
            password: 'hashedpassword',
            timezone: 'America/New_York',
            accountConfimation: { status: true, token: `tok_other_${Date.now()}`, code: '123456' },
            consent: true
        })
        otherCompanyToken = jwt.generateToken(
            { userId: otherCompanyUser._id, email: otherCompanyUser.email, role: otherCompanyUser.role },
            config.TOKENS.ACCESS.SECRET,
            3600
        )

        // Create seeker user
        seekerUser = await UserModel.create({
            name: 'Alice Candidate',
            email: `alice_${Date.now()}_${Math.random()}@candidate.com`,
            phoneNumber: { countryCode: '+1', isoCode: 'US', internationalNumber: '+15551103' },
            role: EUserRoles.SEEKER,
            password: 'hashedpassword',
            timezone: 'America/New_York',
            accountConfimation: { status: true, token: `tok_seeker_${Date.now()}`, code: '654321' },
            consent: true
        })

        // Create published job
        publishedJob = await JobModel.create({
            companyId: companyUser._id,
            title: 'Lead Platform Architect',
            description: 'Lead distributed cloud architectures with Node.js and TypeScript.',
            responsibilities: ['Architect microservices', 'Mentor engineers'],
            requirements: ['TypeScript', 'Node.js', 'Distributed Systems', 'Kubernetes'],
            skills: ['Node.js', 'TypeScript', 'Kubernetes'],
            employmentType: EEmploymentType.FULL_TIME,
            experienceLevel: EExperienceLevel.SENIOR,
            workplaceType: EWorkplaceType.REMOTE,
            location: { city: 'San Francisco', country: 'USA' },
            salary: { min: 160000, max: 210000, currency: 'USD', period: 'YEARLY' },
            status: EJobStatus.PUBLISHED,
            paymentStatus: EPaymentStatus.PAID
        })

        // Create resume & CV analysis
        testResume = await ResumeModel.create({
            seekerId: seekerUser._id,
            originalFileName: 'Alice_CV.pdf',
            storageKey: `resumes/alice_${Date.now()}.pdf`,
            mimeType: 'application/pdf',
            fileSize: 102400,
            fileExtension: 'pdf',
            version: 1,
            isActive: true
        })

        await CVAnalysisModel.create({
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            extractedSkills: ['TypeScript', 'Node.js', 'Distributed Systems', 'Docker'],
            experienceSummary: '10 years leading backend engineering architectures.',
            educationSummary: 'M.S. Computer Science',
            estimatedExperienceLevel: 'SENIOR',
            suggestions: []
        })

        // Mock emailService
        jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true } as any)
    }, 30000)

    afterEach(async () => {
        if (publishedJob?._id) {
            await ApplicationModel.deleteMany({ jobId: publishedJob._id })
            await JobModel.deleteMany({ _id: publishedJob._id })
        }
        await InterviewInviteModel.deleteMany({})
        await TestInviteModel.deleteMany({})
        await CVAnalysisModel.deleteMany({})
        if (testResume?._id) {
            await ResumeModel.deleteMany({ _id: testResume._id })
        }
        if (companyUser?._id && otherCompanyUser?._id && seekerUser?._id) {
            await UserModel.deleteMany({ _id: { $in: [companyUser._id, otherCompanyUser._id, seekerUser._id] } })
        }
        await CompanyProfileModel.deleteMany({})
    }, 30000)

    afterAll(async () => {
        await mongoose.connection.close()
    })

    it('creates InterviewInvite and dispatches email upon written assessment completion', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.SHORTLISTED,
            autoScreeningStatus: 'COMPLETE',
            autoScreeningScore: 85
        })

        const testInvite = await TestInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'test_token_phase10_trigger',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        jest.spyOn(CVAnalysisProvider, 'gradeAssessment').mockResolvedValue({
            score: 90,
            feedback: 'Solid problem solving answers.'
        })

        // Complete written assessment
        const completeRes = await request(app)
            .post(`/v1/test/${testInvite.token}/complete`)
            .send({ responses: [{ question: 'Q1', answer: 'A1' }] })

        expect(completeRes.status).toBe(200)

        // Application must advance to INTERVIEW
        const updatedApp = await ApplicationModel.findById(application._id)
        expect(updatedApp?.status).toBe(EApplicationStatus.INTERVIEW)

        // InterviewInvite must be generated
        const interviewInvite = await InterviewInviteModel.findOne({ applicationId: application._id })
        expect(interviewInvite).toBeDefined()
        expect(interviewInvite?.status).toBe('PENDING')
        expect(interviewInvite?.token).toHaveLength(64) // 32-byte hex

        // Voice Interview email must be sent
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            [seekerUser.email],
            expect.stringContaining('Invitation to AI Voice Interview'),
            expect.any(String),
            expect.stringContaining(interviewInvite!.token)
        )
    })

    it('idempotency: duplicate test completes do not create multiple InterviewInvites', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.SHORTLISTED,
            autoScreeningStatus: 'COMPLETE'
        })

        const testInvite = await TestInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'test_token_idempotent_interview_trigger',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        jest.spyOn(CVAnalysisProvider, 'gradeAssessment').mockResolvedValue({
            score: 85,
            feedback: 'Good.'
        })

        // Call complete twice
        await request(app).post(`/v1/test/${testInvite.token}/complete`).send({ responses: [{ question: 'Q1', answer: 'A1' }] })
        await request(app).post(`/v1/test/${testInvite.token}/complete`).send({ responses: [{ question: 'Q1', answer: 'A1' }] })

        const count = await InterviewInviteModel.countDocuments({ applicationId: application._id })
        expect(count).toBe(1)
    })

    it('public context endpoint GET /v1/interview/:token returns safe data and excludes sensitive internals', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW,
            coverLetter: 'Secret internal applicant note'
        })

        const interviewInvite = await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'valid_interview_token_public_test_9999',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        const res = await request(app).get(`/v1/interview/${interviewInvite.token}`)
        expect(res.status).toBe(200)
        expect(res.body.data.candidateName).toBe('Alice Candidate')
        expect(res.body.data.jobTitle).toBe('Lead Platform Architect')
        expect(res.body.data.companyName).toBe('Acme Innovations Inc.')
        expect(res.body.data.candidateSkills).toContain('TypeScript')
        expect(res.body.data.experienceLevel).toBe('SENIOR')
        expect(res.body.data.experienceSummary).toContain('10 years leading backend')
        expect(res.body.data.status).toBe('PENDING')

        // Exclusions: Ensure no internal sensitive properties exposed
        expect(res.body.data.resumeId).toBeUndefined()
        expect(res.body.data.coverLetter).toBeUndefined()
        expect(res.body.data.password).toBeUndefined()
    })

    it('public context endpoint rejects expired token with 410 Gone', async () => {
        const expiredInvite = await InterviewInviteModel.create({
            applicationId: new mongoose.Types.ObjectId(),
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'expired_interview_token_1111',
            status: 'PENDING',
            expiresAt: new Date(Date.now() - 10000)
        })

        const res = await request(app).get(`/v1/interview/${expiredInvite.token}`)
        expect(res.status).toBe(410)
    })

    it('public start endpoint POST /v1/interview/:token/start transitions status to STARTED', async () => {
        const invite = await InterviewInviteModel.create({
            applicationId: new mongoose.Types.ObjectId(),
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'start_interview_token_2222',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        const res = await request(app)
            .post(`/v1/interview/${invite.token}/start`)
            .send({ vapiCallId: 'vapi_call_id_start_123' })

        expect(res.status).toBe(200)
        expect(res.body.data.status).toBe('STARTED')

        const updated = await InterviewInviteModel.findById(invite._id)
        expect(updated?.status).toBe('STARTED')
        expect(updated?.vapiCallId).toBe('vapi_call_id_start_123')
    })

    it('webhook POST /v1/webhooks/vapi verifies x-vapi-secret header', async () => {
        const payload = {
            message: {
                type: 'end-of-call-report',
                call: { id: 'call_1', metadata: { token: 'sample_token' } }
            }
        }

        // Invalid secret
        const invalidRes = await request(app)
            .post('/v1/webhooks/vapi')
            .set('x-vapi-secret', 'wrong_secret')
            .send(payload)
        expect(invalidRes.status).toBe(401)

        // Valid secret
        const validRes = await request(app)
            .post('/v1/webhooks/vapi')
            .set('x-vapi-secret', config.VAPI_WEBHOOK_SECRET)
            .send(payload)
        expect(validRes.status).toBe(200)
    })

    it('webhook receives end-of-call-report, saves transcript, grades with Groq, and completes invite', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW
        })

        const invite = await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'webhook_test_token_grade_3333',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        jest.spyOn(CVAnalysisProvider, 'gradeInterviewTranscript').mockResolvedValue({
            score: 94,
            feedback: 'Outstanding verbal communication and clear deep knowledge of distributed systems.'
        })

        const webhookPayload = {
            message: {
                type: 'end-of-call-report',
                call: {
                    id: 'vapi_call_uuid_9999',
                    status: 'ended',
                    metadata: {
                        token: invite.token,
                        applicationId: (application as any)._id.toString()
                    }
                },
                transcript: 'AI: Welcome Alice! Can you tell me about distributed systems?\nAlice: Yes, I have built microservices with Kafka and Kubernetes.'
            }
        }

        const res = await request(app)
            .post('/v1/webhooks/vapi')
            .set('x-vapi-secret', config.VAPI_WEBHOOK_SECRET)
            .send(webhookPayload)

        expect(res.status).toBe(200)
        expect(res.body.data.status).toBe('COMPLETED')
        expect(res.body.data.interviewScore).toBe(94)
        expect(res.body.data.interviewFeedback).toContain('Outstanding verbal communication')

        const updatedInvite = await InterviewInviteModel.findById(invite._id)
        expect(updatedInvite?.status).toBe('COMPLETED')
        expect(updatedInvite?.transcript).toContain('Kafka and Kubernetes')
        expect(updatedInvite?.interviewScore).toBe(94)
        expect(updatedInvite?.vapiCallId).toBe('vapi_call_uuid_9999')
    })

    it('webhook idempotency: duplicate webhook calls do not re-grade or error', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW
        })

        const invite = await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'webhook_idempotent_token_4444',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        jest.spyOn(CVAnalysisProvider, 'gradeInterviewTranscript').mockResolvedValue({
            score: 88,
            feedback: 'Strong verbal performance.'
        })

        const webhookPayload = {
            message: {
                type: 'end-of-call-report',
                call: {
                    id: 'vapi_call_uuid_idempotent',
                    metadata: { token: invite.token }
                },
                transcript: 'Conversation transcript here'
            }
        }

        // First delivery
        const res1 = await request(app)
            .post('/v1/webhooks/vapi')
            .set('x-vapi-secret', config.VAPI_WEBHOOK_SECRET)
            .send(webhookPayload)
        expect(res1.status).toBe(200)

        // Second duplicate delivery
        const res2 = await request(app)
            .post('/v1/webhooks/vapi')
            .set('x-vapi-secret', config.VAPI_WEBHOOK_SECRET)
            .send(webhookPayload)
        expect(res2.status).toBe(200)
        expect(res2.body.data.status).toBe('COMPLETED')
    })

    it('graceful degradation: AI grading failure preserves raw transcript with interviewScore: null', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW
        })

        const invite = await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'webhook_ai_fail_token_5555',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        // Mock Groq failure
        jest.spyOn(CVAnalysisProvider, 'gradeInterviewTranscript').mockResolvedValue({
            score: 0,
            feedback: '',
            unavailable: true
        })

        const webhookPayload = {
            message: {
                type: 'end-of-call-report',
                call: {
                    id: 'vapi_call_uuid_fail',
                    metadata: { token: invite.token }
                },
                transcript: 'Raw candidate conversation that must never be lost.'
            }
        }

        const res = await request(app)
            .post('/v1/webhooks/vapi')
            .set('x-vapi-secret', config.VAPI_WEBHOOK_SECRET)
            .send(webhookPayload)

        expect(res.status).toBe(200)
        expect(res.body.data.interviewScore).toBeNull()

        // Raw transcript MUST be saved
        const updatedInvite = await InterviewInviteModel.findById(invite._id)
        expect(updatedInvite?.status).toBe('COMPLETED')
        expect(updatedInvite?.transcript).toBe('Raw candidate conversation that must never be lost.')
        expect(updatedInvite?.interviewScore).toBeNull()
    })

    it('company endpoint GET /v1/company/applications/:applicationId/interview-invite returns data with IDOR protection', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW
        })

        await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'company_view_invite_token_6666',
            status: 'COMPLETED',
            transcript: 'Full interview transcript for employer review',
            interviewScore: 91,
            interviewFeedback: 'Great candidate.',
            completedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        // 1. Authorized company (job owner) -> 200 OK
        const ownerRes = await request(app)
            .get(`/v1/company/applications/${application._id}/interview-invite`)
            .set('Authorization', `Bearer ${companyToken}`)
        expect(ownerRes.status).toBe(200)
        expect(ownerRes.body.data.token).toBe('company_view_invite_token_6666')
        expect(ownerRes.body.data.interviewScore).toBe(91)
        expect(ownerRes.body.data.transcript).toBe('Full interview transcript for employer review')

        // 2. IDOR Protection: Unrelated company -> 404
        const idorRes = await request(app)
            .get(`/v1/company/applications/${application._id}/interview-invite`)
            .set('Authorization', `Bearer ${otherCompanyToken}`)
            expect(idorRes.status).toBe(404)
    })

    it('client fallback POST /v1/interview/:token/finalize saves transcript, integrity stats, and grades interview', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW
        })

        const invite = await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'client_finalize_token_7777',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        jest.spyOn(CVAnalysisProvider, 'gradeInterviewTranscript').mockResolvedValue({
            score: 95,
            feedback: 'Excellent responses and structured problem solving.'
        })

        const res = await request(app)
            .post(`/v1/interview/${invite.token}/finalize`)
            .send({
                transcript: 'AI Interviewer: Tell me about architecture.\nCandidate: I design resilient microservices.',
                endedReason: 'ASSISTANT_ENDED',
                tabSwitchCount: 1,
                tabSwitchDuration: 5
            })

        expect(res.status).toBe(200)
        expect(res.body.data.status).toBe('COMPLETED')
        expect(res.body.data.interviewScore).toBe(95)
        expect(res.body.data.endedReason).toBe('ASSISTANT_ENDED')
        expect(res.body.data.tabSwitchCount).toBe(1)
        expect(res.body.data.tabSwitchDuration).toBe(5)

        const updated = await InterviewInviteModel.findById(invite._id)
        expect(updated?.status).toBe('COMPLETED')
        expect(updated?.interviewScore).toBe(95)
        expect(updated?.endedReason).toBe('ASSISTANT_ENDED')
        expect(updated?.tabSwitchCount).toBe(1)
        expect(updated?.tabSwitchDuration).toBe(5)
    })

    it('dual-path idempotency: client fallback followed by webhook does not double-grade', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW
        })

        const invite = await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'dual_path_token_8888',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        const gradeSpy = jest.spyOn(CVAnalysisProvider, 'gradeInterviewTranscript').mockResolvedValue({
            score: 87,
            feedback: 'Good communication.'
        })

        // 1. Client fallback arrives first
        const clientRes = await request(app)
            .post(`/v1/interview/${invite.token}/finalize`)
            .send({
                transcript: 'AI: Welcome.\nCandidate: Hello.',
                endedReason: 'MAX_DURATION_REACHED',
                tabSwitchCount: 2,
                tabSwitchDuration: 12
            })
        expect(clientRes.status).toBe(200)
        expect(clientRes.body.data.status).toBe('COMPLETED')
        expect(gradeSpy).toHaveBeenCalledTimes(1)

        // 2. Webhook arrives second
        const webhookRes = await request(app)
            .post('/v1/webhooks/vapi')
            .set('x-vapi-secret', config.VAPI_WEBHOOK_SECRET)
            .send({
                message: {
                    type: 'end-of-call-report',
                    call: { id: 'vapi_call_8888', metadata: { token: invite.token } },
                    transcript: 'AI: Welcome.\nCandidate: Hello.'
                }
            })
        expect(webhookRes.status).toBe(200)
        expect(webhookRes.body.data.status).toBe('COMPLETED')
        // Grade should not have been called a second time
        expect(gradeSpy).toHaveBeenCalledTimes(1)
    })

    it('client finalize records TAB_SWITCH_TIMEOUT when integrity cutoff triggers', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW
        })

        const invite = await InterviewInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'tab_violation_token_9999',
            status: 'STARTED',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        const res = await request(app)
            .post(`/v1/interview/${invite.token}/finalize`)
            .send({
                transcript: 'Partial transcript before candidate left tab.',
                endedReason: 'TAB_SWITCH_TIMEOUT',
                tabSwitchCount: 3,
                tabSwitchDuration: 25
            })

        expect(res.status).toBe(200)
        expect(res.body.data.status).toBe('COMPLETED')
        expect(res.body.data.endedReason).toBe('TAB_SWITCH_TIMEOUT')
        expect(res.body.data.tabSwitchCount).toBe(3)
        expect(res.body.data.tabSwitchDuration).toBe(25)
    })
})
