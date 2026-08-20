import { Router } from 'express'
import authenticationController from './authentication.controller'

const router = Router()

router.route('/register').post(authenticationController.register)
router.route('/registeration/confirm/:token').patch(authenticationController.confirmRegistration)

router.route('/login').post(authenticationController.login)
router.route('/logout').put(authenticationController.logout)

// Password Recovery routes
router.route('/forgot-password').post(authenticationController.forgotPassword)
router.route('/auth/forgot-password').post(authenticationController.forgotPassword)
router.route('/reset-password').post(authenticationController.resetPassword)
router.route('/auth/reset-password').post(authenticationController.resetPassword)

// Google OAuth 2.0 routes
router.route('/auth/google').get(authenticationController.googleAuthInitiate)
router.route('/auth/google/callback').get(authenticationController.googleAuthCallback)
router.route('/api/auth/google').get(authenticationController.googleAuthInitiate)
router.route('/api/auth/google/callback').get(authenticationController.googleAuthCallback)

export default router
