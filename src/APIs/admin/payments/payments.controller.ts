import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../../handlers/async'
import httpResponse from '../../../handlers/httpResponse'
import httpError from '../../../handlers/errorHandler/httpError'
import responseMessage from '../../../constant/responseMessage'
import { CustomError } from '../../../utils/errors'
import * as adminPaymentsService from './payments.service'

export default {
    getPayments: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const page = parseInt(request.query.page as string, 10) || 1
            const limit = parseInt(request.query.limit as string, 10) || 10
            const status = request.query.status as string | undefined
            const companyId = request.query.companyId as string | undefined
            const jobId = request.query.jobId as string | undefined

            const data = await adminPaymentsService.getPayments(page, limit, status, companyId, jobId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    getPaymentById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { paymentId } = request.params
            const data = await adminPaymentsService.getPaymentById(paymentId)
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
