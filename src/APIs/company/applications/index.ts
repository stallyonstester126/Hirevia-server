import { Router } from 'express'
import companyApplicationsController from './applications.controller'
import authenticate from '../../../middlewares/authenticate'
import authorize from '../../../middlewares/authorize'
import { EUserRoles } from '../../../constant/users'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router
    .route('/:applicationId')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.getApplicationById)

router
    .route('/:applicationId/status')
    .patch(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.updateStatus)

router
    .route('/:applicationId/resume')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.getResumeFile)

router
    .route('/:applicationId/analysis')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.getAnalysis)

router
    .route('/:applicationId/analysis/match')
    .post(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.matchJob)

router
    .route('/:applicationId/test-invite')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.getTestInvite)

router
    .route('/:applicationId/interview-invite')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyApplicationsController.getInterviewInvite)

export default router


