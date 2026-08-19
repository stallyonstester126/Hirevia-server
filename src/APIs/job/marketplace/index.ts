import { Router } from 'express'
import marketplaceController from './marketplace.controller'
import rateLimiter from '../../../middlewares/rateLimiter'
import seekerApplicationsController from '../../seeker/applications/applications.controller'
import authenticate from '../../../middlewares/authenticate'
import authorize from '../../../middlewares/authorize'
import { EUserRoles } from '../../../constant/users'

const router = Router()

router
    .route('/')
    .get(rateLimiter, marketplaceController.getJobs)

router
    .route('/:jobId')
    .get(rateLimiter, marketplaceController.getJobById)

router
    .route('/:jobId/apply')
    .post(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerApplicationsController.apply)

export default router
