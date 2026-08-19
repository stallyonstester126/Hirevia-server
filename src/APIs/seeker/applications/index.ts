import { Router } from 'express'
import seekerApplicationsController from './applications.controller'
import authenticate from '../../../middlewares/authenticate'
import authorize from '../../../middlewares/authorize'
import { EUserRoles } from '../../../constant/users'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router
    .route('/')
    .get(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerApplicationsController.getApplications)

router
    .route('/:applicationId')
    .get(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerApplicationsController.getApplicationById)

router
    .route('/:applicationId/withdraw')
    .patch(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerApplicationsController.withdraw)

export default router
