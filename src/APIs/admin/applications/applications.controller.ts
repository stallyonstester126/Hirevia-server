import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../../handlers/async'
import httpResponse from '../../../handlers/httpResponse'
import httpError from '../../../handlers/errorHandler/httpError'
import responseMessage from '../../../constant/responseMessage'
import { CustomError } from '../../../utils/errors'
import * as adminApplicationsService from './applications.service'
import { EApplicationStatus } from '../../../constant/applications'

export default {
    getApplications: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const page = parseInt(request.query.page as string, 10) || 1
            const limit = parseInt(request.query.limit as string, 10) || 10
            const status = request.query.status as EApplicationStatus | undefined
            const jobId = request.query.jobId as string | undefined
            const seekerId = request.query.seekerId as string | undefined
            const autoScreeningStatus = request.query.autoScreeningStatus as string | undefined

            const data = await adminApplicationsService.getApplications(
                page,
                limit,
                status,
                jobId,
                seekerId,
                autoScreeningStatus
            )
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    getApplicationById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { applicationId } = request.params
            const data = await adminApplicationsService.getApplicationCaseFile(applicationId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    })
}
