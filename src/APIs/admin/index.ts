import { Router } from 'express'
import authenticate from '../../middlewares/authenticate'
import authorize from '../../middlewares/authorize'
import rateLimiter from '../../middlewares/rateLimiter'
import { EUserRoles } from '../../constant/users'

import usersController from './users/users.controller'
import jobsController from './jobs/jobs.controller'
import applicationsController from './applications/applications.controller'
import paymentsController from './payments/payments.controller'
import statsController from './stats/stats.controller'

const router = Router()

// Apply authentication, rateLimiter, and ADMIN role requirement across all admin routes
router.use(rateLimiter, authenticate, authorize(EUserRoles.ADMIN))

// ================= USER MODERATION =================
router.route('/users').get(usersController.getUsers)
router.route('/users/:userId').get(usersController.getUserById)
router.route('/users/:userId/suspend').patch(usersController.suspendUser)
router.route('/users/:userId/reactivate').patch(usersController.reactivateUser)

// ================= JOB MODERATION =================
router.route('/jobs').get(jobsController.getJobs)
router.route('/jobs/:jobId').get(jobsController.getJobById)
router.route('/jobs/:jobId/close').patch(jobsController.closeJob)
router.route('/jobs/:jobId').delete(jobsController.deleteJob)

// ================= APPLICATION OVERSIGHT (READ-ONLY) =================
router.route('/applications').get(applicationsController.getApplications)
router.route('/applications/:applicationId').get(applicationsController.getApplicationById)

// ================= PAYMENT OVERSIGHT (READ-ONLY) =================
router.route('/payments').get(paymentsController.getPayments)
router.route('/payments/:paymentId').get(paymentsController.getPaymentById)

// ================= PLATFORM STATISTICS =================
router.route('/stats').get(statsController.getStats)

export default router
