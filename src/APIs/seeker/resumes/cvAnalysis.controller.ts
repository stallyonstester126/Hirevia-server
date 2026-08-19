import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import * as cvAnalysisService from '../_shared/services/cvAnalysis.service'
import asyncHandler from '../../../handlers/async'

export default {
    analyze: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { resumeId } = req.params
            const force = req.query.force === 'true'

            const analysis = await cvAnalysisService.analyzeResume(seekerId, resumeId, force)
            httpResponse(response, request, 200, responseMessage.SUCCESS, analysis)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getAnalysis: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { resumeId } = req.params

            const analysis = await cvAnalysisService.getResumeAnalysis(seekerId, resumeId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, analysis)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
