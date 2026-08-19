import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../../handlers/async'
import httpResponse from '../../../handlers/httpResponse'
import httpError from '../../../handlers/errorHandler/httpError'
import responseMessage from '../../../constant/responseMessage'
import { CustomError } from '../../../utils/errors'
import * as adminJobsService from './jobs.service'
import { EJobStatus } from '../../../constant/jobs'

export default {
    getJobs: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const page = parseInt(request.query.page as string, 10) || 1
            const limit = parseInt(request.query.limit as string, 10) || 10
            const status = request.query.status as EJobStatus | undefined
            const companyId = request.query.companyId as string | undefined

            const data = await adminJobsService.getJobs(page, limit, status, companyId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    getJobById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { jobId } = request.params
            const data = await adminJobsService.getJobById(jobId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    closeJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { jobId } = request.params
            const data = await adminJobsService.closeJob(jobId)
            httpResponse(response, request, 200, 'Job closed successfully', data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    deleteJob: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { jobId } = request.params
            const data = await adminJobsService.deleteJob(jobId)
            httpResponse(response, request, 200, 'Job deleted successfully', data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    })
}
