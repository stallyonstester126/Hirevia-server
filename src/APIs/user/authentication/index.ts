import { Router } from 'express'
import authenticationController from './authentication.controller'

const router = Router()

router.route('/register').post(authenticationController.register)
router.route('/registeration/confirm/:token').patch(authenticationController.confirmRegistration)

router.route('/login').post(authenticationController.login)
router.route('/logout').put(authenticationController.logout)

export default router
