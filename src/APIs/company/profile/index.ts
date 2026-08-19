import { Router } from 'express'
import companyProfileController from './companyProfile.controller'
import authenticate from '../../../middlewares/authenticate'
import authorize from '../../../middlewares/authorize'
import { EUserRoles } from '../../../constant/users'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router
    .route('/profile')
    .get(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyProfileController.getProfile)
    .post(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyProfileController.createProfile)
    .patch(rateLimiter, authenticate, authorize(EUserRoles.COMPANY), companyProfileController.updateProfile)

export default router
