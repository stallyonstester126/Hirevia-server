import { NextFunction, Request, Response } from 'express'
import { IAuthenticateRequest, IDecryptedJwt } from '../types/types'
import jwt from '../utils/jwt'
import config from '../config/config'
import query from '../APIs/user/_shared/repo/user.repository'
import httpError from '../handlers/errorHandler/httpError'
import responseMessage from '../constant/responseMessage'
import asyncHandler from '../handlers/async'

export default asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
    try {
        const req = request as IAuthenticateRequest
        const { cookies, headers } = req

        let token = cookies?.accessToken

        // Support Authorization: Bearer <token> header as well
        if (!token && headers.authorization && headers.authorization.startsWith('Bearer ')) {
            token = headers.authorization.split(' ')[1]
        }

        if (token) {
            try {
                const { userId } = jwt.verifyToken(token, config.TOKENS.ACCESS.SECRET) as IDecryptedJwt

                const user = await query.findUserById(userId)
                if (user) {
                    req.authenticatedUser = user
                    return next()
                }
            } catch (jwtError) {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), request, 401)
            }
        }
        return httpError(next, new Error(responseMessage.UNAUTHORIZED), request, 401)
    } catch (error) {
        return httpError(next, error, request, 500)
    }
})
