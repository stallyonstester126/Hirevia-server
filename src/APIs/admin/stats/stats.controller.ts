import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../../handlers/async'
import httpResponse from '../../../handlers/httpResponse'
import httpError from '../../../handlers/errorHandler/httpError'
import responseMessage from '../../../constant/responseMessage'
import { CustomError } from '../../../utils/errors'
import * as adminStatsService from './stats.service'

export default {
    getStats: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const data = await adminStatsService.getPlatformStats()
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
