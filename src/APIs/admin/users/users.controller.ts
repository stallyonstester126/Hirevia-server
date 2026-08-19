import { NextFunction, Request, Response } from 'express'
import asyncHandler from '../../../handlers/async'
import httpResponse from '../../../handlers/httpResponse'
import httpError from '../../../handlers/errorHandler/httpError'
import responseMessage from '../../../constant/responseMessage'
import { CustomError } from '../../../utils/errors'
import * as adminUsersService from './users.service'
import { IAuthenticateRequest } from '../../../types/types'
import { EUserRoles } from '../../../constant/users'

export default {
    getUsers: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const page = parseInt(request.query.page as string, 10) || 1
            const limit = parseInt(request.query.limit as string, 10) || 10
            const role = request.query.role as EUserRoles | undefined
            let isSuspended: boolean | undefined = undefined
            if (request.query.isSuspended === 'true') isSuspended = true
            if (request.query.isSuspended === 'false') isSuspended = false

            const data = await adminUsersService.getUsers(page, limit, role, isSuspended)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    getUserById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { userId } = request.params
            const data = await adminUsersService.getUserById(userId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    suspendUser: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const authReq = request as IAuthenticateRequest
            const adminUserId = authReq.authenticatedUser._id.toString()
            const { userId } = request.params
            const reason = request.body?.reason || request.body?.suspensionReason

            const data = await adminUsersService.suspendUser(adminUserId, userId, reason)
            httpResponse(response, request, 200, 'User suspended successfully', data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    }),

    reactivateUser: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { userId } = request.params
            const data = await adminUsersService.reactivateUser(userId)
            httpResponse(response, request, 200, 'User reactivated successfully', data)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error as Error, request, 500)
            }
        }
    })
}
