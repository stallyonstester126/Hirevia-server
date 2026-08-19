import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import * as interviewInviteService from '../_shared/services/interviewInvite.service'
import asyncHandler from '../../../handlers/async'

export default {
    getPublicInterview: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { token } = request.params
            const data = await interviewInviteService.getPublicInterviewByToken(token)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    startPublicInterview: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { token } = request.params
            const { vapiCallId } = request.body || {}
            const data = await interviewInviteService.startPublicInterviewByToken(token, vapiCallId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    finalizePublicInterview: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { token } = request.params
            const { transcript, vapiCallId, endedReason, tabSwitchCount, tabSwitchDuration } = request.body || {}
            const data = await interviewInviteService.finalizePublicInterviewByToken(token, {
                transcript,
                vapiCallId,
                endedReason,
                tabSwitchCount,
                tabSwitchDuration
            })
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
