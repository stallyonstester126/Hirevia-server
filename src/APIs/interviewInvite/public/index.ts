import { Router } from 'express'
import controller from './interviewInvite.controller'
import rateLimiter from '../../../middlewares/rateLimiter'

const router = Router()

router.route('/:token').get(rateLimiter, controller.getPublicInterview)
router.route('/:token/start').post(rateLimiter, controller.startPublicInterview)
router.route('/:token/finalize').post(rateLimiter, controller.finalizePublicInterview)

export default router
