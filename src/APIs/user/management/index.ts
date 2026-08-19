import { Router } from 'express'
import managementController from './management.controller'
import authenticate from '../../../middlewares/authenticate'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router.route('/me').get(rateLimiter, authenticate, managementController.me)
router.route('/profile').patch(rateLimiter, authenticate, managementController.updateProfile)
router.route('/change-password').post(rateLimiter, authenticate, managementController.changePassword)

export default router
