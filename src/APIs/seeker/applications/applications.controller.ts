import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import { validateSchema } from '../../../utils/joi-validate'
import { getSeekerApplicationsQuerySchema, applyJobSchema } from './validation/validation.schema'
import * as applicationService from '../../application/_shared/services/application.service'
import asyncHandler from '../../../handlers/async'

export default {
    apply: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params
            const { body } = req

            const { error, payload } = validateSchema<any>(applyJobSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const application = await applicationService.applyToJob(seekerId, jobId, payload.resumeId, payload.coverLetter)
            httpResponse(response, request, 201, responseMessage.SUCCESS, application)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getApplications: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { query } = req

            const { error, payload } = validateSchema<any>(getSeekerApplicationsQuerySchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await applicationService.getSeekerApplications(seekerId, payload.page, payload.limit)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getApplicationById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const application = await applicationService.getSeekerApplicationById(seekerId, applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, application)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    withdraw: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const application = await applicationService.withdrawApplication(seekerId, applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, application)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
