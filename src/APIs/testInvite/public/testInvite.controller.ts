import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import * as testInviteService from '../_shared/services/testInvite.service'
import asyncHandler from '../../../handlers/async'

export default {
    getPublicTest: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { token } = request.params
            const data = await testInviteService.getPublicTestByToken(token)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    startPublicTest: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { token } = request.params
            const data = await testInviteService.startPublicTestByToken(token)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    completePublicTest: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { token } = request.params
            const responses = request.body?.responses || request.body?.answers || []
            const data = await testInviteService.completePublicTestByToken(token, responses)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
