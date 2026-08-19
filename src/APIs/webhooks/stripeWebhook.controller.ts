import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import { CustomError } from '../../utils/errors'
import * as webhookService from '../company/_shared/services/webhook.service'
import asyncHandler from '../../handlers/async'

export default {
    receive: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const rawBody = (request as Request & { rawBody?: Buffer }).rawBody
            const signature = request.headers['stripe-signature'] as string

            if (!rawBody) {
                return httpError(next, new CustomError('Missing raw request body buffer', 400), request, 400)
            }

            if (!signature) {
                return httpError(next, new CustomError('Missing stripe-signature header', 400), request, 400)
            }

            const result = await webhookService.handleStripeWebhook(rawBody, signature)
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
