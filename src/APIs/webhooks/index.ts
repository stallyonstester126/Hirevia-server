import { Router } from 'express'
import stripeWebhookController from './stripeWebhook.controller'
import vapiWebhookController from './vapiWebhook.controller'
import rateLimiter from '../../middlewares/rateLimiter'

const router = Router()

router.route('/stripe').post(rateLimiter, stripeWebhookController.receive)
router.route('/vapi').post(rateLimiter, vapiWebhookController.receive)

export default router
