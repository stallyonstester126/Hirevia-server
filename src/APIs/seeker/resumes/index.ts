import { Router } from 'express'
import seekerResumesController from './resumes.controller'
import cvAnalysisController from './cvAnalysis.controller'
import authenticate from '../../../middlewares/authenticate'
import authorize from '../../../middlewares/authorize'
import { EUserRoles } from '../../../constant/users'
import rateLimiter from '../../../middlewares/rateLimiter'
import uploadResumeMiddleware from '../../../middlewares/upload'

const router = Router()

router
    .route('/')
    .post(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), uploadResumeMiddleware, seekerResumesController.upload)
    .get(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerResumesController.list)

router
    .route('/:resumeId')
    .get(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerResumesController.getById)
    .delete(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerResumesController.delete)

router
    .route('/:resumeId/file')
    .get(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), seekerResumesController.getFile)

router
    .route('/:resumeId/analyze')
    .post(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), cvAnalysisController.analyze)

router
    .route('/:resumeId/analysis')
    .get(rateLimiter, authenticate, authorize(EUserRoles.SEEKER), cvAnalysisController.getAnalysis)

export default router
