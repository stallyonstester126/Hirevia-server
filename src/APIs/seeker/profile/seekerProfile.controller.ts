import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import { validateSchema } from '../../../utils/joi-validate'
import { createSeekerProfileSchema, updateSeekerProfileSchema } from './validation/validation.schema'
import { getProfileByUserId, createSeekerProfile, updateSeekerProfile } from './seekerProfile.service'
import { ISeekerProfile } from '../_shared/types/seekerProfile.interface'
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

            const { error, payload } = validateSchema<ISeekerProfile>(createSeekerProfileSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const profile = await createSeekerProfile(userId, payload)
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

            const { error, payload } = validateSchema<Partial<ISeekerProfile>>(updateSeekerProfileSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const profile = await updateSeekerProfile(userId, payload)
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
