import authorize from '../../middlewares/authorize'
import { EUserRoles } from '../../constant/users'
import { Response, NextFunction } from 'express'
import httpError from '../../handlers/errorHandler/httpError'

jest.mock('../../handlers/errorHandler/httpError')

describe('Authorize Middleware', () => {
    let mockRequest: any
    let mockResponse: any
    let mockNext: NextFunction

    beforeEach(() => {
        mockRequest = {}
        mockResponse = {}
        mockNext = jest.fn()
        jest.clearAllMocks()
    })

    it('should call next if user has allowed role', () => {
        mockRequest.authenticatedUser = { role: EUserRoles.ADMIN }
        const middleware = authorize(EUserRoles.ADMIN)
        middleware(mockRequest, mockResponse as Response, mockNext)
        expect(mockNext).toHaveBeenCalled()
        expect(httpError).not.toHaveBeenCalled()
    })

    it('should call httpError with 401 if user is not authenticated', () => {
        const middleware = authorize(EUserRoles.ADMIN)
        middleware(mockRequest, mockResponse as Response, mockNext)
        expect(httpError).toHaveBeenCalledWith(mockNext, expect.any(Error), mockRequest, 401)
    })

    it('should call httpError with 403 if user does not have allowed role', () => {
        mockRequest.authenticatedUser = { role: EUserRoles.SEEKER }
        const middleware = authorize(EUserRoles.ADMIN)
        middleware(mockRequest, mockResponse as Response, mockNext)
        expect(httpError).toHaveBeenCalledWith(mockNext, expect.any(Error), mockRequest, 403)
    })

    it('should allow user if multiple roles are permitted and user has one', () => {
        mockRequest.authenticatedUser = { role: EUserRoles.COMPANY }
        const middleware = authorize(EUserRoles.ADMIN, EUserRoles.COMPANY)
        middleware(mockRequest, mockResponse as Response, mockNext)
        expect(mockNext).toHaveBeenCalled()
        expect(httpError).not.toHaveBeenCalled()
    })
})
