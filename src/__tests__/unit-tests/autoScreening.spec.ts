import request from 'supertest'
import mongoose from 'mongoose'
import app from '../../app'
import ApplicationModel from '../../APIs/application/_shared/models/application.model'
import TestInviteModel from '../../APIs/testInvite/_shared/models/testInvite.model'
import JobModel from '../../APIs/job/_shared/models/job.model'
import UserModel from '../../APIs/user/_shared/models/user.model'
import ResumeModel from '../../APIs/seeker/_shared/models/resume.model'
import JobMatchScoreModel from '../../APIs/application/_shared/models/jobMatchScore.model'
import CVAnalysisModel from '../../APIs/seeker/_shared/models/cvAnalysis.model'
import { processAutoScreening } from '../../APIs/application/_shared/services/autoScreening.service'
import CVAnalysisProvider from '../../services/ai/groq.provider'
import * as textExtractor from '../../utils/textExtractor'
import emailService from '../../services/email'
import StorageService from '../../services/storage'
import { EApplicationStatus } from '../../constant/applications'
import { EJobStatus, EEmploymentType, EExperienceLevel, EWorkplaceType, EPaymentStatus } from '../../constant/jobs'
import { EUserRoles } from '../../constant/users'
import jwt from '../../utils/jwt'
import config from '../../config/config'

describe('Automated AI Screening, Assessment Grading & Interview Transition Pipeline', () => {
    let companyUser: any
    let seekerUser: any
    let companyToken: string
    let publishedJob: any
    let testResume: any

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DATABASE_URL as string)
        }
    })

    beforeEach(async () => {
        jest.clearAllMocks()

        // Create company user
        companyUser = await UserModel.create({
            name: 'Acme Corp Admin',
            email: `company_${Date.now()}_${Math.random()}@acme.com`,
            phoneNumber: { countryCode: '+1', isoCode: 'US', internationalNumber: '+15550001' },
            role: EUserRoles.COMPANY,
            password: 'hashedpassword',
            timezone: 'America/New_York',
            accountConfimation: {
                status: true,
                token: `token_${Date.now()}`,
                code: '123456'
            },
            consent: true
        })
        companyToken = jwt.generateToken(
            { userId: companyUser._id, email: companyUser.email, role: companyUser.role },
            config.TOKENS.ACCESS.SECRET,
            3600
        )

        // Create seeker user
        seekerUser = await UserModel.create({
            name: 'Bob Candidate',
            email: `seeker_${Date.now()}_${Math.random()}@candidate.com`,
            phoneNumber: { countryCode: '+1', isoCode: 'US', internationalNumber: '+15550002' },
            role: EUserRoles.SEEKER,
            password: 'hashedpassword',
            timezone: 'America/New_York',
            accountConfimation: {
                status: true,
                token: `token_seeker_${Date.now()}`,
                code: '654321'
            },
            consent: true
        })

        // Create published job
        publishedJob = await JobModel.create({
            companyId: companyUser._id,
            title: 'Senior Backend Engineer',
            description: 'Develop Node.js and TypeScript services.',
            responsibilities: ['Build APIs', 'Write tests'],
            requirements: ['TypeScript', 'Node.js', 'MongoDB'],
            skills: ['Node.js', 'TypeScript', 'MongoDB'],
            employmentType: EEmploymentType.FULL_TIME,
            experienceLevel: EExperienceLevel.SENIOR,
            workplaceType: EWorkplaceType.REMOTE,
            location: { city: 'Seattle', country: 'USA' },
            salary: { min: 120000, max: 160000, currency: 'USD', period: 'YEARLY' },
            status: EJobStatus.PUBLISHED,
            paymentStatus: EPaymentStatus.PAID
        })

        // Create resume
        testResume = await ResumeModel.create({
            seekerId: seekerUser._id,
            originalFileName: 'Bob_Resume.pdf',
            storageKey: `resumes/bob_${Date.now()}.pdf`,
            mimeType: 'application/pdf',
            fileSize: 102400,
            fileExtension: 'pdf',
            version: 1,
            isActive: true
        })

        // Mock StorageService, textExtractor and emailService
        jest.spyOn(StorageService, 'get').mockResolvedValue(Buffer.from('Mock PDF Content'))
        jest.spyOn(textExtractor, 'default').mockResolvedValue('Senior Software Engineer with Node.js and TypeScript expertise')
        jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true } as any)
    })

    afterEach(async () => {
        if (publishedJob?._id) {
            await ApplicationModel.deleteMany({ jobId: publishedJob._id })
            await JobModel.deleteMany({ _id: publishedJob._id })
        }
        await TestInviteModel.deleteMany({})
        await JobMatchScoreModel.deleteMany({})
        await CVAnalysisModel.deleteMany({})
        if (testResume?._id) {
            await ResumeModel.deleteMany({ _id: testResume._id })
        }
        if (companyUser?._id && seekerUser?._id) {
            await UserModel.deleteMany({ _id: { $in: [companyUser._id, seekerUser._id] } })
        }
    })

    afterAll(async () => {
        await mongoose.connection.close()
    })

    it('score >= 70 (threshold): automatically advances SUBMITTED -> UNDER_REVIEW -> SHORTLISTED, creates TestInvite, sends email', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.SUBMITTED,
            autoScreeningStatus: 'PENDING'
        })

        // Mock AI match returning 85 (above 70)
        jest.spyOn(CVAnalysisProvider, 'analyze').mockResolvedValue({
            extractedSkills: ['Node.js', 'TypeScript', 'MongoDB'],
            experienceSummary: '5 years backend experience',
            educationSummary: 'B.S. Computer Science',
            estimatedExperienceLevel: 'SENIOR',
            suggestions: ['Highlight cloud experience']
        } as any)

        jest.spyOn(CVAnalysisProvider, 'matchJob').mockResolvedValue({
            score: 85,
            rationale: 'Exceptional backend and TypeScript match for senior role.'
        } as any)

        await processAutoScreening((application as any)._id.toString())

        const updatedApp = await ApplicationModel.findById(application._id)
        expect(updatedApp?.status).toBe(EApplicationStatus.SHORTLISTED)
        expect(updatedApp?.autoScreeningStatus).toBe('COMPLETE')
        expect(updatedApp?.autoScreeningScore).toBe(85)
        expect(updatedApp?.advancedBy).toBe('SYSTEM_AI')

        // Verify TestInvite created
        const testInvite = await TestInviteModel.findOne({ applicationId: application._id })
        expect(testInvite).toBeDefined()
        expect(testInvite?.token).toHaveLength(64) // 32 bytes hex = 64 chars
        expect(testInvite?.status).toBe('PENDING')
        expect(testInvite?.expiresAt.getTime()).toBeGreaterThan(Date.now())

        // Verify candidate email was sent
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            [seekerUser.email],
            expect.stringContaining('Invitation to Assessment'),
            expect.any(String),
            expect.stringContaining(testInvite!.token)
        )
    })

    it('score exactly at 70 threshold: qualifies and auto-shortlists', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.SUBMITTED,
            autoScreeningStatus: 'PENDING'
        })

        jest.spyOn(CVAnalysisProvider, 'analyze').mockResolvedValue({
            extractedSkills: ['Node.js', 'TypeScript'],
            experienceSummary: 'Backend developer',
            educationSummary: 'B.S. CS',
            estimatedExperienceLevel: 'MID',
            suggestions: []
        } as any)

        jest.spyOn(CVAnalysisProvider, 'matchJob').mockResolvedValue({
            score: 70,
            rationale: 'Meets minimum qualification criteria.'
        } as any)

        await processAutoScreening((application as any)._id.toString())

        const updatedApp = await ApplicationModel.findById(application._id)
        expect(updatedApp?.status).toBe(EApplicationStatus.SHORTLISTED)
        expect(updatedApp?.autoScreeningStatus).toBe('COMPLETE')
        expect(updatedApp?.autoScreeningScore).toBe(70)

        const testInvite = await TestInviteModel.findOne({ applicationId: application._id })
        expect(testInvite).not.toBeNull()
    })

    it('score < 70 (below threshold): leaves status as SUBMITTED, does NOT generate TestInvite', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.SUBMITTED,
            autoScreeningStatus: 'PENDING'
        })

        jest.spyOn(CVAnalysisProvider, 'analyze').mockResolvedValue({
            extractedSkills: ['Python', 'Django'],
            experienceSummary: 'Python developer',
            educationSummary: 'B.A.',
            estimatedExperienceLevel: 'JUNIOR',
            suggestions: []
        } as any)

        jest.spyOn(CVAnalysisProvider, 'matchJob').mockResolvedValue({
            score: 55,
            rationale: 'Candidate lacks required Node.js and TypeScript depth.'
        } as any)

        await processAutoScreening((application as any)._id.toString())

        const updatedApp = await ApplicationModel.findById(application._id)
        expect(updatedApp?.status).toBe(EApplicationStatus.SUBMITTED)
        expect(updatedApp?.autoScreeningStatus).toBe('COMPLETE')
        expect(updatedApp?.autoScreeningScore).toBe(55)
        expect(updatedApp?.advancedBy).toBeNull()

        // No TestInvite created
        const testInvite = await TestInviteModel.findOne({ applicationId: application._id })
        expect(testInvite).toBeNull()
        expect(emailService.sendEmail).not.toHaveBeenCalled()
    })

    it('idempotency: multiple invocations do not double-process or re-send emails', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.SUBMITTED,
            autoScreeningStatus: 'PENDING'
        })

        jest.spyOn(CVAnalysisProvider, 'analyze').mockResolvedValue({
            extractedSkills: ['Node.js'],
            experienceSummary: 'Backend',
            educationSummary: 'B.S.',
            estimatedExperienceLevel: 'SENIOR',
            suggestions: []
        } as any)

        jest.spyOn(CVAnalysisProvider, 'matchJob').mockResolvedValue({
            score: 90,
            rationale: 'Excellent fit.'
        } as any)

        // First run
        await processAutoScreening((application as any)._id.toString())
        expect(emailService.sendEmail).toHaveBeenCalledTimes(1)

        // Second run
        await processAutoScreening((application as any)._id.toString())
        expect(emailService.sendEmail).toHaveBeenCalledTimes(1) // Still only 1 email
    })

    it('completing assessment while SHORTLISTED transitions to INTERVIEW, stores responses and runs AI grading', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.SHORTLISTED,
            autoScreeningStatus: 'COMPLETE',
            autoScreeningScore: 88,
            advancedBy: 'SYSTEM_AI'
        })

        const testInvite = await TestInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'valid_token_assessment_test_123',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        // Mock AI grading
        jest.spyOn(CVAnalysisProvider, 'gradeAssessment').mockResolvedValue({
            score: 92,
            feedback: 'Strong understanding of microservice architecture and distributed systems.'
        })

        const responses = [
            { question: 'Describe your architecture experience.', answer: 'Built distributed message queues with RabbitMQ and Node.js.' },
            { question: 'How do you handle testing?', answer: 'Comprehensive unit tests with Jest and CI/CD pipelines.' }
        ]

        // 1. Start test
        await request(app).post(`/v1/test/${testInvite.token}/start`)

        // 2. Complete test with responses
        const completeRes = await request(app)
            .post(`/v1/test/${testInvite.token}/complete`)
            .send({ responses })

        expect(completeRes.status).toBe(200)
        expect(completeRes.body.data.status).toBe('COMPLETED')
        expect(completeRes.body.data.assessmentScore).toBe(92)
        expect(completeRes.body.data.assessmentFeedback).toContain('microservice architecture')

        // Verify Application transitioned to INTERVIEW
        const updatedApp = await ApplicationModel.findById(application._id)
        expect(updatedApp?.status).toBe(EApplicationStatus.INTERVIEW)
        expect(updatedApp?.advancedBy).toBe('SYSTEM_AI')

        // Verify TestInvite document persisted responses
        const updatedInvite = await TestInviteModel.findOne({ token: testInvite.token })
        expect(updatedInvite?.responses).toHaveLength(2)
        expect(updatedInvite?.responses?.[0].answer).toBe('Built distributed message queues with RabbitMQ and Node.js.')
        expect(updatedInvite?.assessmentScore).toBe(92)
    })

    it('guard test: completing assessment when status is NOT SHORTLISTED does NOT transition application status', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.REJECTED, // Terminal status
            autoScreeningStatus: 'COMPLETE'
        })

        const testInvite = await TestInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'valid_token_rejected_app_test',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        jest.spyOn(CVAnalysisProvider, 'gradeAssessment').mockResolvedValue({
            score: 80,
            feedback: 'Good answers.'
        })

        const completeRes = await request(app)
            .post(`/v1/test/${testInvite.token}/complete`)
            .send({ responses: [{ question: 'Q1', answer: 'A1' }] })

        expect(completeRes.status).toBe(200)

        // Status remains REJECTED
        const updatedApp = await ApplicationModel.findById(application._id)
        expect(updatedApp?.status).toBe(EApplicationStatus.REJECTED)
    })

    it('idempotency: completing assessment twice is safe and does not double-transition or error', async () => {
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
            token: 'valid_token_idempotent_test',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        jest.spyOn(CVAnalysisProvider, 'gradeAssessment').mockResolvedValue({
            score: 88,
            feedback: 'Great performance.'
        })

        // First completion
        const res1 = await request(app)
            .post(`/v1/test/${testInvite.token}/complete`)
            .send({ responses: [{ question: 'Q1', answer: 'A1' }] })
        expect(res1.status).toBe(200)

        // Second completion (retry)
        const res2 = await request(app)
            .post(`/v1/test/${testInvite.token}/complete`)
            .send({ responses: [{ question: 'Q1', answer: 'A1' }] })
        expect(res2.status).toBe(200)
        expect(res2.body.data.status).toBe('COMPLETED')
    })

    it('AI grading failure graceful degradation: still saves responses and transitions to INTERVIEW', async () => {
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
            token: 'valid_token_ai_failure_test',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        // Mock AI grading failure / unavailable
        jest.spyOn(CVAnalysisProvider, 'gradeAssessment').mockResolvedValue({
            score: 0,
            feedback: '',
            unavailable: true
        })

        const completeRes = await request(app)
            .post(`/v1/test/${testInvite.token}/complete`)
            .send({ responses: [{ question: 'Q1', answer: 'My custom answer' }] })

        expect(completeRes.status).toBe(200)
        expect(completeRes.body.data.assessmentScore).toBeNull()

        // Application MUST still transition to INTERVIEW
        const updatedApp = await ApplicationModel.findById(application._id)
        expect(updatedApp?.status).toBe(EApplicationStatus.INTERVIEW)

        // Responses preserved
        const updatedInvite = await TestInviteModel.findOne({ token: testInvite.token })
        expect(updatedInvite?.responses).toHaveLength(1)
        expect(updatedInvite?.responses?.[0].answer).toBe('My custom answer')
    })

    it('company endpoint GET /v1/company/applications/:applicationId/test-invite returns responses and AI score', async () => {
        const application = await ApplicationModel.create({
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            resumeId: testResume._id,
            status: EApplicationStatus.INTERVIEW,
            autoScreeningStatus: 'COMPLETE'
        })

        await TestInviteModel.create({
            applicationId: application._id,
            jobId: publishedJob._id,
            seekerId: seekerUser._id,
            token: 'company_view_token_full',
            status: 'COMPLETED',
            responses: [{ question: 'Explain ACID', answer: 'Atomicity, Consistency, Isolation, Durability' }],
            assessmentScore: 95,
            assessmentFeedback: 'Exemplary database comprehension.',
            completedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        const res = await request(app)
            .get(`/v1/company/applications/${application._id}/test-invite`)
            .set('Authorization', `Bearer ${companyToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.token).toBe('company_view_token_full')
        expect(res.body.data.status).toBe('COMPLETED')
        expect(res.body.data.assessmentScore).toBe(95)
        expect(res.body.data.assessmentFeedback).toBe('Exemplary database comprehension.')
        expect(res.body.data.responses).toHaveLength(1)
        expect(res.body.data.responses[0].question).toBe('Explain ACID')
    })
})
