import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import { validateSchema } from '../../../utils/joi-validate'
import { createJobSchema, updateJobSchema } from './validation/validation.schema'
import * as jobService from '../../job/_shared/services/job.service'
import asyncHandler from '../../../handlers/async'
import { IJob } from '../../job/_shared/types/job.interface'

export default {
    createJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { body } = req

            const { error, payload } = validateSchema<Partial<IJob>>(createJobSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const job = await jobService.createJob(companyId, payload)
            httpResponse(response, request, 201, responseMessage.SUCCESS, job)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getJobs: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id

            const page = Math.max(1, parseInt(req.query.page as string) || 1)
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10))

            const result = await jobService.getCompanyJobs(companyId, page, limit)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getJobById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params

            const job = await jobService.getCompanyJobById(companyId, jobId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, job)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params
            const { body } = req

            const { error, payload } = validateSchema<Partial<IJob>>(updateJobSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const job = await jobService.updateJob(companyId, jobId, payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, job)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    deleteJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params

            const result = await jobService.deleteJob(companyId, jobId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    closeJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params

            const job = await jobService.closeJob(companyId, jobId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, job)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    publishJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params

            const job = await jobService.publishJob(companyId, jobId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, job)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
