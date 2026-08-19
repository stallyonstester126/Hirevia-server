import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { validateSchema } from '../../../utils/joi-validate'
import { getPublicJobsQuerySchema } from './validation/validation.schema'
import * as jobService from '../_shared/services/job.service'
import asyncHandler from '../../../handlers/async'

export default {
    getJobs: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { query } = request

            const { error, payload } = validateSchema<any>(getPublicJobsQuerySchema, query)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const result = await jobService.getPublicJobs(payload)
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
            const { jobId } = request.params

            const job = await jobService.getPublicJobById(jobId)
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
