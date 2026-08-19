import { NextFunction, Response, Request } from 'express'
import { IAuthenticateRequest } from '../types/types'
import { EUserRoles } from '../constant/users'
import httpError from '../handlers/errorHandler/httpError'
import responseMessage from '../constant/responseMessage'

export default (...allowedRoles: EUserRoles[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const authenticatedRequest = req as IAuthenticateRequest
        const user = authenticatedRequest.authenticatedUser

        if (!user) {
            return httpError(next, new Error(responseMessage.UNAUTHORIZED), req, 401)
        }

        if (!allowedRoles.includes(user.role)) {
            return httpError(
                next,
                new Error('You do not have permission to access this resource'),
                req,
                403
            )
        }

        next()
    }
}
