import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import { validateSchema } from '../../../utils/joi-validate'
import { getCompanyApplicationsQuerySchema, updateApplicationStatusSchema } from './validation/validation.schema'
import * as applicationService from '../../application/_shared/services/application.service'
import asyncHandler from '../../../handlers/async'

export default {
    getJobApplications: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params
            const { query } = req

            const { error, payload } = validateSchema<any>(getCompanyApplicationsQuerySchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await applicationService.getJobApplications(
                companyId,
                jobId,
                payload.page,
                payload.limit,
                payload.status
            )
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
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const result = await applicationService.getCompanyApplicationById(companyId, applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateStatus: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params
            const { body } = req

            const { error, payload } = validateSchema<any>(updateApplicationStatusSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const application = await applicationService.updateApplicationStatus(companyId, applicationId, payload.status)
            httpResponse(response, request, 200, responseMessage.SUCCESS, application)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getResumeFile: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const { fileBuffer, originalFileName, mimeType } = await applicationService.getCompanyApplicationResumeFile(
                companyId,
                applicationId
            )

            response.setHeader('Content-Type', mimeType)
            response.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`)
            response.send(fileBuffer)
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
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const result = await applicationService.getCompanyApplicationAnalysis(companyId, applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    matchJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const result = await applicationService.matchCompanyApplicationJob(companyId, applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getTestInvite: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const result = await applicationService.getCompanyApplicationTestInvite(companyId, applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getInterviewInvite: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { applicationId } = req.params

            const result = await applicationService.getCompanyApplicationInterviewInvite(companyId, applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}

