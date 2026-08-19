import { Router } from 'express'
import controller from './testInvite.controller'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router.route('/:token').get(rateLimiter, controller.getPublicTest)
router.route('/:token/start').post(rateLimiter, controller.startPublicTest)
router.route('/:token/complete').post(rateLimiter, controller.completePublicTest)

export default router
