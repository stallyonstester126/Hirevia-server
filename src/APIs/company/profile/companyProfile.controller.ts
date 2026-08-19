import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import { validateSchema } from '../../../utils/joi-validate'
import { createCompanyProfileSchema, updateCompanyProfileSchema } from './validation/validation.schema'
import { getProfileByUserId, createCompanyProfile, updateCompanyProfile } from './companyProfile.service'
import { ICompanyProfile } from '../_shared/types/companyProfile.interface'
import asyncHandler from '../../../handlers/async'

export default {
    getProfile: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const userId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const profile = await getProfileByUserId(userId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, profile)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    createProfile: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const userId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { body } = req

            const { error, payload } = validateSchema<ICompanyProfile>(createCompanyProfileSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const profile = await createCompanyProfile(userId, payload)
            httpResponse(response, request, 201, responseMessage.SUCCESS, profile)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    updateProfile: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const userId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { body } = req

            const { error, payload } = validateSchema<Partial<ICompanyProfile>>(updateCompanyProfileSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const profile = await updateCompanyProfile(userId, payload)
            httpResponse(response, request, 200, responseMessage.SUCCESS, profile)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
