import { Router } from 'express'
import companyJobsController from './jobs.controller'
import companyApplicationsController from '../applications/applications.controller'
import paymentController from './payment.controller'
import authenticate from '../../../middlewares/authenticate'
import authorize from '../../../middlewares/authorize'
import { EUserRoles } from '../../../constant/users'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router
    .route('/')
    .post(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyJobsController.createJob)
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyJobsController.getJobs)

router
    .route('/:jobId')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyJobsController.getJobById)
    .patch(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyJobsController.updateJob)
    .delete(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyJobsController.deleteJob)

router
    .route('/:jobId/close')
    .patch(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyJobsController.closeJob)

router
    .route('/:jobId/publish')
    .patch(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyJobsController.publishJob)

router
    .route('/:jobId/applications')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.getJobApplications)

router
    .route('/confirm-payment')
    .post(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), paymentController.confirmSession)
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), paymentController.confirmSession)

router
    .route('/:jobId/checkout')
    .post(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), paymentController.createCheckout)

router
    .route('/:jobId/payment')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), paymentController.getPaymentStatus)

export default router
