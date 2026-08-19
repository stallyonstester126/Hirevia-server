import { Router } from 'express'
import seekerProfileController from './seekerProfile.controller'
import authenticate from '../../../middlewares/authenticate'
import authorize from '../../../middlewares/authorize'
import { EUserRoles } from '../../../constant/users'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router
    .route('/profile')
    .get(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerProfileController.getProfile)
    .post(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerProfileController.createProfile)
    .patch(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerProfileController.updateProfile)

export default router
