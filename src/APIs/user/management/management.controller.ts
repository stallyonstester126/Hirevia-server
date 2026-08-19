import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IMyUser } from './types/management.interface'
import * as managementService from './management.service'

export default {
    me: (request: Request, response: Response, next: NextFunction) => {
        try {
            const { authenticatedUser } = request as unknown as IMyUser
            httpResponse(response, request, 200, responseMessage.SUCCESS, authenticatedUser)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    },

    changePassword: async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { authenticatedUser } = request as unknown as IMyUser
            const { currentPassword, newPassword } = request.body
            const result = await managementService.changePassword(
                authenticatedUser._id.toString(),
                currentPassword,
                newPassword
            )
            httpResponse(response, request, 200, 'Password updated successfully', result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    },

    updateProfile: async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { authenticatedUser } = request as unknown as IMyUser
            const { name, phoneNumber, timezone } = request.body
            const updated = await managementService.updateAccountProfile(
                authenticatedUser._id.toString(),
                { name, phoneNumber, timezone }
            )
            httpResponse(response, request, 200, 'Account updated successfully', updated)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }
}
