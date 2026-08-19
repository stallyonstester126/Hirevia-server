import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { CustomError } from '../../../utils/errors'
import { IAuthenticateRequest } from '../../../types/types'
import * as resumeService from '../_shared/services/resume.service'
import asyncHandler from '../../../handlers/async'

export default {
    upload: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { file } = req

            if (!file) {
                return httpError(next, new CustomError('No file uploaded', 400), request, 400)
            }

            const resume = await resumeService.uploadResume(seekerId, file)
            httpResponse(response, request, 201, responseMessage.SUCCESS, resume)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    list: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id

            const resumes = await resumeService.listResumes(seekerId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, resumes)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getById: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { resumeId } = req.params

            const resume = await resumeService.getResume(seekerId, resumeId)
            httpResponse(response, request, 200, responseMessage.SUCCESS, resume)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    getFile: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { resumeId } = req.params

            const { fileBuffer, originalFileName, mimeType } = await resumeService.getResumeFile(seekerId, resumeId)

            response.setHeader('Content-Type', mimeType)
            response.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`)
            response.send(fileBuffer)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    delete: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const req = request as IAuthenticateRequest
            const seekerId = (req.authenticatedUser as any)._id || (req.authenticatedUser as any).id
            const { resumeId } = req.params

            const result = await resumeService.deleteResume(seekerId, resumeId)
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
