import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import * as paymentService from '../_shared/services/payment.service'
import asyncHandler from '../../../handlers/async'

export default {
    createSubscriptionCheckout: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const companyEmail = (req.authenticatedUser as any).email
            const { successUrl, cancelUrl } = request.body || {}

            const result = await paymentService.createCompanySubscriptionCheckout(
                companyId,
                companyEmail,
                successUrl,
                cancelUrl
            )
            httpResponse(response, request, 201, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    getSubscriptionStatus: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id

            const result = await paymentService.getCompanySubscriptionStatus(companyId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    createCheckout: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const companyEmail = (req.authenticatedUser as any).email
            const { jobId } = req.params

            const result = await paymentService.createJobCheckoutSession(companyId, companyEmail, jobId)
            httpResponse(response, request, 201, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    getPaymentStatus: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { jobId } = req.params

            const result = await paymentService.getJobPaymentStatus(companyId, jobId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),

    confirmSession: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const companyId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const sessionId = (req.query.sessionId as string) || (req.body.sessionId as string)

            if (!sessionId) {
                throw new CustomError('Session ID is required', 400)
            }

            const result = await paymentService.confirmSessionPayment(companyId, sessionId)
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
