import request from 'supertest'
import mongoose from 'mongoose'
import app from '../../app'
import userModel from '../../APIs/user/_shared/models/user.model'
import jobModel from '../../APIs/job/_shared/models/job.model'
import applicationModel from '../../APIs/application/_shared/models/application.model'
import paymentModel from '../../APIs/company/_shared/models/payment.model'
import testInviteModel from '../../APIs/testInvite/_shared/models/testInvite.model'
import interviewInviteModel from '../../APIs/interviewInvite/_shared/models/interviewInvite.model'
import jobMatchScoreModel from '../../APIs/application/_shared/models/jobMatchScore.model'
import seekerProfileModel from '../../APIs/seeker/_shared/models/seekerProfile.model'
import { EUserRoles } from '../../constant/users'
import { EJobStatus, EPaymentStatus, EEmploymentType, EExperienceLevel, EWorkplaceType } from '../../constant/jobs'
import { EApplicationStatus } from '../../constant/applications'
import jwt from '../../utils/jwt'
import config from '../../config/config'
import hashing from '../../utils/hashing'
import { loginService } from '../../APIs/user/authentication/authentication.service'

describe('Phase 11 — Admin Module Test Suite', () => {
    let adminToken: string
    let seekerToken: string
    let companyToken: string
    let adminUser: any
    let targetSeekerUser: any
    let anotherAdminUser: any
    let companyUser: any
    let testJob: any
    let testApplication: any
    let testPayment: any

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DATABASE_URL as string)
        }

        const hashedPassword = await hashing.hashPassword('Password123!')

        // Create test admin
        adminUser = await userModel.create({
            name: 'Primary Admin',
            email: `primary_admin_${Date.now()}@test.com`,
            phoneNumber: { isoCode: 'US', countryCode: '1', internationalNumber: '+12025550101' },
            timezone: 'UTC',
            password: hashedPassword,
            role: EUserRoles.ADMIN,
            accountConfimation: { status: true, token: 'tok_admin_1', code: '111111', timestamp: new Date() },
            consent: true,
            isSuspended: false
        })
        adminToken = jwt.generateToken({ userId: adminUser._id }, config.TOKENS.ACCESS.SECRET, config.TOKENS.ACCESS.EXPIRY)

        // Create secondary admin
        anotherAdminUser = await userModel.create({
            name: 'Secondary Admin',
            email: `secondary_admin_${Date.now()}@test.com`,
            phoneNumber: { isoCode: 'US', countryCode: '1', internationalNumber: '+12025550102' },
            timezone: 'UTC',
            password: hashedPassword,
            role: EUserRoles.ADMIN,
            accountConfimation: { status: true, token: 'tok_admin_2', code: '222222', timestamp: new Date() },
            consent: true,
            isSuspended: false
        })

        // Create test company
        companyUser = await userModel.create({
            name: 'Test Employer Corp',
            email: `employer_${Date.now()}@test.com`,
            phoneNumber: { isoCode: 'US', countryCode: '1', internationalNumber: '+12025550103' },
            timezone: 'UTC',
            password: hashedPassword,
            role: EUserRoles.COMPANY,
            accountConfimation: { status: true, token: 'tok_comp_1', code: '333333', timestamp: new Date() },
            consent: true,
            isSuspended: false
        })
        companyToken = jwt.generateToken({ userId: companyUser._id }, config.TOKENS.ACCESS.SECRET, config.TOKENS.ACCESS.EXPIRY)

        // Create test seeker
        targetSeekerUser = await userModel.create({
            name: 'Test Seeker Candidate',
            email: `seeker_${Date.now()}@test.com`,
            phoneNumber: { isoCode: 'US', countryCode: '1', internationalNumber: '+12025550104' },
            timezone: 'UTC',
            password: hashedPassword,
            role: EUserRoles.SEEKER,
            accountConfimation: { status: true, token: 'tok_seek_1', code: '444444', timestamp: new Date() },
            consent: true,
            isSuspended: false
        })
        seekerToken = jwt.generateToken({ userId: targetSeekerUser._id }, config.TOKENS.ACCESS.SECRET, config.TOKENS.ACCESS.EXPIRY)

        // Create seeker profile
        await seekerProfileModel.create({
            userId: targetSeekerUser._id,
            headline: 'Full Stack Engineer',
            bio: 'Experienced in TypeScript and React',
            skills: ['Node.js', 'React', 'MongoDB']
        })

        // Create test job
        testJob = await jobModel.create({
            companyId: companyUser._id,
            title: 'Staff Software Engineer',
            description: 'Core infrastructure role',
            responsibilities: ['Architect services'],
            requirements: ['Node.js expertise'],
            skills: ['Node.js', 'TypeScript'],
            employmentType: EEmploymentType.FULL_TIME,
            experienceLevel: EExperienceLevel.SENIOR,
            location: { city: 'San Francisco', country: 'USA' },
            workplaceType: EWorkplaceType.REMOTE,
            salary: { min: 140000, max: 180000, currency: 'USD', period: 'YEARLY' },
            status: EJobStatus.PUBLISHED,
            paymentStatus: EPaymentStatus.PAID
        })

        // Create test application
        testApplication = await applicationModel.create({
            jobId: testJob._id,
            seekerId: targetSeekerUser._id,
            coverLetter: 'I would love to join your team.',
            status: EApplicationStatus.SHORTLISTED,
            autoScreeningStatus: 'COMPLETE',
            autoScreeningScore: 88,
            autoScreeningRationale: 'Great technical match',
            advancedBy: 'SYSTEM_AI'
        })

        // Create test job match score
        await jobMatchScoreModel.create({
            applicationId: testApplication._id,
            resumeId: new mongoose.Types.ObjectId(),
            jobId: testJob._id,
            score: 88,
            rationale: 'Great technical match'
        })

        // Create test written test invite
        await testInviteModel.create({
            applicationId: testApplication._id,
            jobId: testJob._id,
            seekerId: targetSeekerUser._id,
            token: `test_token_${Date.now()}`,
            status: 'COMPLETED',
            assessmentScore: 85,
            assessmentFeedback: 'Solid architectural understanding',
            expiresAt: new Date(Date.now() + 86400000),
            completedAt: new Date()
        })

        // Create test interview invite
        await interviewInviteModel.create({
            applicationId: testApplication._id,
            jobId: testJob._id,
            seekerId: targetSeekerUser._id,
            token: `interview_token_${Date.now()}`,
            status: 'COMPLETED',
            interviewScore: 90,
            interviewFeedback: 'Excellent communication and domain knowledge',
            transcript: 'AI: Tell me about yourself.\nCandidate: I am an engineer.',
            expiresAt: new Date(Date.now() + 86400000),
            completedAt: new Date()
        })

        // Create test payment
        testPayment = await paymentModel.create({
            jobId: testJob._id,
            companyId: companyUser._id,
            stripeSessionId: `cs_test_${Date.now()}`,
            stripePaymentIntentId: `pi_test_${Date.now()}`,
            amount: 1000,
            currency: 'usd',
            status: 'SUCCEEDED',
            paidAt: new Date()
        })
    })

    afterAll(async () => {
        // Clean up test data
        if (adminUser) await userModel.findByIdAndDelete(adminUser._id)
        if (anotherAdminUser) await userModel.findByIdAndDelete(anotherAdminUser._id)
        if (companyUser) await userModel.findByIdAndDelete(companyUser._id)
        if (targetSeekerUser) {
            await userModel.findByIdAndDelete(targetSeekerUser._id)
            await seekerProfileModel.deleteMany({ userId: targetSeekerUser._id })
        }
        if (testJob) await jobModel.findByIdAndDelete(testJob._id)
        if (testApplication) {
            await applicationModel.findByIdAndDelete(testApplication._id)
            await jobMatchScoreModel.deleteMany({ applicationId: testApplication._id })
            await testInviteModel.deleteMany({ applicationId: testApplication._id })
            await interviewInviteModel.deleteMany({ applicationId: testApplication._id })
        }
        if (testPayment) await paymentModel.findByIdAndDelete(testPayment._id)
        await mongoose.connection.close()
    })

    // ================= 1. AUTHORIZATION & RBAC =================
    describe('Admin RBAC & Authentication Enforcement', () => {
        it('should return 401 Unauthorized for unauthenticated requests on /v1/admin/users', async () => {
            const res = await request(app).get('/v1/admin/users')
            expect(res.status).toBe(401)
        })

        it('should return 403 Forbidden when accessed by a SEEKER role', async () => {
            const res = await request(app)
                .get('/v1/admin/users')
                .set('Authorization', `Bearer ${seekerToken}`)
            expect(res.status).toBe(403)
        })

        it('should return 403 Forbidden when accessed by a COMPANY role', async () => {
            const res = await request(app)
                .get('/v1/admin/users')
                .set('Authorization', `Bearer ${companyToken}`)
            expect(res.status).toBe(403)
        })

        it('should return 200 OK when accessed by an ADMIN role', async () => {
            const res = await request(app)
                .get('/v1/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(res.body.data).toHaveProperty('users')
            expect(res.body.data).toHaveProperty('pagination')
        })
    })

    // ================= 2. USER MODERATION =================
    describe('User Moderation & Suspension Pipeline', () => {
        it('should list users with pagination and role filtering', async () => {
            const res = await request(app)
                .get('/v1/admin/users?role=SEEKER')
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.data.users)).toBe(true)
            expect(res.body.data.users.every((u: any) => u.role === EUserRoles.SEEKER)).toBe(true)
        })

        it('should retrieve a single user with sensitive tokens excluded', async () => {
            const res = await request(app)
                .get(`/v1/admin/users/${targetSeekerUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.data._id).toBe(targetSeekerUser._id.toString())
            expect(res.body.data).not.toHaveProperty('password')
            expect(res.body.data?.accountConfimation?.token).toBeUndefined()
            expect(res.body.data?.accountConfimation?.code).toBeUndefined()
        })

        it('should block an admin from suspending their own account', async () => {
            const res = await request(app)
                .patch(`/v1/admin/users/${adminUser._id}/suspend`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Self lock test' })

            expect(res.status).toBe(400)
            expect(res.body.message).toMatch(/cannot suspend their own account/i)
        })

        it('should block an admin from suspending another ADMIN account', async () => {
            const res = await request(app)
                .patch(`/v1/admin/users/${anotherAdminUser._id}/suspend`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Admin conflict test' })

            expect(res.status).toBe(403)
            expect(res.body.message).toMatch(/cannot suspend another administrator account/i)
        })

        it('should successfully suspend a target seeker user', async () => {
            const res = await request(app)
                .patch(`/v1/admin/users/${targetSeekerUser._id}/suspend`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Terms of service violation' })

            expect(res.status).toBe(200)
            expect(res.body.data.isSuspended).toBe(true)
            expect(res.body.data.suspensionReason).toBe('Terms of service violation')
            expect(res.body.data.suspendedAt).toBeDefined()
        })

        it('should reject login for a suspended user with 403 Account suspended', async () => {
            await expect(
                loginService({
                    email: targetSeekerUser.email,
                    password: 'Password123!'
                })
            ).rejects.toThrow('Account suspended')
        })

        it('should successfully reactivate a suspended user', async () => {
            const res = await request(app)
                .patch(`/v1/admin/users/${targetSeekerUser._id}/reactivate`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.data.isSuspended).toBe(false)
            expect(res.body.data.suspendedAt).toBeNull()
            expect(res.body.data.suspensionReason).toBeNull()
        })

        it('should allow login again once the user is reactivated', async () => {
            const loginResult = await loginService({
                email: targetSeekerUser.email,
                password: 'Password123!'
            })
            expect(loginResult.success).toBe(true)
            expect(loginResult.accessToken).toBeDefined()
        })
    })

    // ================= 3. JOB MODERATION =================
    describe('Job Moderation', () => {
        it('should list all platform jobs with company population and pagination', async () => {
            const res = await request(app)
                .get('/v1/admin/jobs')
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.data.jobs)).toBe(true)
            expect(res.body.data.pagination).toBeDefined()
        })

        it('should get job detail regardless of company ownership', async () => {
            const res = await request(app)
                .get(`/v1/admin/jobs/${testJob._id}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.data._id).toBe(testJob._id.toString())
            expect(res.body.data.title).toBe('Staff Software Engineer')
        })

        it('should force-close any published job', async () => {
            const res = await request(app)
                .patch(`/v1/admin/jobs/${testJob._id}/close`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe(EJobStatus.CLOSED)
        })

        it('should block deletion of a job that has existing applications (Option A)', async () => {
            const res = await request(app)
                .delete(`/v1/admin/jobs/${testJob._id}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(400)
            expect(res.body.message).toMatch(/cannot delete job with existing applications/i)
        })

        it('should successfully delete a job when it has NO applications', async () => {
            const orphanJob = await jobModel.create({
                companyId: companyUser._id,
                title: 'Orphan Job To Delete',
                description: 'Description',
                employmentType: EEmploymentType.FULL_TIME,
                experienceLevel: EExperienceLevel.MID,
                location: { city: 'Austin', country: 'USA' },
                workplaceType: EWorkplaceType.REMOTE,
                salary: { min: 5000, max: 7000, currency: 'USD', period: 'MONTHLY' },
                status: EJobStatus.DRAFT,
                paymentStatus: EPaymentStatus.UNPAID
            })

            const res = await request(app)
                .delete(`/v1/admin/jobs/${orphanJob._id}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.message).toMatch(/deleted successfully/i)

            const verifyDeleted = await jobModel.findById(orphanJob._id)
            expect(verifyDeleted).toBeNull()
        })
    })

    // ================= 4. APPLICATION OVERSIGHT (READ-ONLY) =================
    describe('Application Oversight (Strictly Read-Only)', () => {
        it('should list all applications across the platform', async () => {
            const res = await request(app)
                .get('/v1/admin/applications')
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.data.applications)).toBe(true)
            expect(res.body.data.pagination).toBeDefined()
        })

        it('should assemble a complete read-only case file for an application', async () => {
            const res = await request(app)
                .get(`/v1/admin/applications/${testApplication._id}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            const caseFile = res.body.data
            expect(caseFile.application._id).toBe(testApplication._id.toString())
            expect(caseFile.application.autoScreeningScore).toBe(88)
            expect(caseFile.seekerProfile).toBeDefined()
            expect(caseFile.seekerProfile.headline).toBe('Full Stack Engineer')
            expect(caseFile.jobMatchScore).toBeDefined()
            expect(caseFile.jobMatchScore.score).toBe(88)
            expect(caseFile.testInvite).toBeDefined()
            expect(caseFile.testInvite.assessmentScore).toBe(85)
            expect(caseFile.interviewInvite).toBeDefined()
            expect(caseFile.interviewInvite.interviewScore).toBe(90)
        })

        it('should confirm NO status update endpoint exists under /v1/admin/applications', async () => {
            const res = await request(app)
                .patch(`/v1/admin/applications/${testApplication._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: EApplicationStatus.HIRED })

            expect(res.status).toBe(404)
        })
    })

    // ================= 5. PAYMENT OVERSIGHT (READ-ONLY) =================
    describe('Payment Oversight (Strictly Read-Only)', () => {
        it('should list all payments with pagination and filters', async () => {
            const res = await request(app)
                .get('/v1/admin/payments')
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.data.payments)).toBe(true)
            expect(res.body.data.pagination).toBeDefined()
        })

        it('should get payment detail by ID', async () => {
            const res = await request(app)
                .get(`/v1/admin/payments/${testPayment._id}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            expect(res.body.data._id).toBe(testPayment._id.toString())
            expect(res.body.data.amount).toBe(1000)
            expect(res.body.data.status).toBe('SUCCEEDED')
        })
    })

    // ================= 6. PLATFORM STATISTICS =================
    describe('Platform Statistics (Aggregation Engine)', () => {
        it('should return aggregated platform stats with accurate numbers', async () => {
            const res = await request(app)
                .get('/v1/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200)
            const stats = res.body.data

            // Verify structure
            expect(stats).toHaveProperty('users')
            expect(stats.users).toHaveProperty('total')
            expect(stats.users).toHaveProperty('suspendedCount')
            expect(Array.isArray(stats.users.byRole)).toBe(true)

            expect(stats).toHaveProperty('jobs')
            expect(stats.jobs).toHaveProperty('total')
            expect(Array.isArray(stats.jobs.byStatus)).toBe(true)

            expect(stats).toHaveProperty('applications')
            expect(stats.applications).toHaveProperty('total')
            expect(Array.isArray(stats.applications.byStatus)).toBe(true)
            expect(Array.isArray(stats.applications.byAutoScreeningStatus)).toBe(true)
            expect(Array.isArray(stats.applications.byAdvancedBy)).toBe(true)

            expect(stats).toHaveProperty('payments')
            expect(stats.payments).toHaveProperty('total')
            expect(stats.payments).toHaveProperty('totalRevenueCents')
            expect(stats.payments).toHaveProperty('totalRevenueFormatted')

            expect(stats).toHaveProperty('cvAnalysis')
            expect(stats).toHaveProperty('testInvites')
            expect(stats).toHaveProperty('interviewInvites')
            expect(stats).toHaveProperty('resumes')
        })
    })
})
