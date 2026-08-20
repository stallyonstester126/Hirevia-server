import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../../handlers/httpResponse'
import responseMessage from '../../../constant/responseMessage'
import httpError from '../../../handlers/errorHandler/httpError'
import { IConfirmRegistration, ILogin, ILoginRequest, IRegister, IRegisterRequest } from './types/authentication.interface'
import { validateSchema } from '../../../utils/joi-validate'
import { loginSchema, registerSchema } from './validation/validation.schema'
import { accountConfirmationService, googleAuthCallbackService, googleAuthInitiateService, loginService, registrationService } from './authentication.service'
import { CustomError } from '../../../utils/errors'
import asyncHandler from '../../../handlers/async'
import { EApplicationEnvironment } from '../../../constant/application'
import config from '../../../config/config'
import query from '../_shared/repo/token.repository'

export default {
    register: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as IRegister

            //Payload validation
            const { error, payload } = validateSchema<IRegisterRequest>(registerSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const registrationResult = await registrationService(payload)
            if (registrationResult.success === true) {
                httpResponse(response, request, 201, responseMessage.auth.USER_REGISTERED, registrationResult)
            }
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    confirmRegistration: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { params, query } = request as IConfirmRegistration

            const { token } = params
            const { code } = query

            const user = await accountConfirmationService(token, code)

            httpResponse(response, request, 201, responseMessage.auth.USER_REGISTERED, user)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    login: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { body } = request as ILogin

            //Payload validation
            const { error, payload } = validateSchema<ILoginRequest>(loginSchema, body)
            if (error) {
                return httpError(next, error, request, 422)
            }

            const isLoggedIn = await loginService(payload)
            if (isLoggedIn.success === true) {
                //sending cookies
                const isProd =
                    config.ENV === EApplicationEnvironment.PRODUCTION ||
                    process.env.NODE_ENV === 'production'
                const cookieOptions = {
                    path: '/',
                    sameSite: isProd ? ('none' as const) : ('lax' as const),
                    httpOnly: true,
                    secure: isProd
                }

                response
                    .cookie('accessToken', isLoggedIn.accessToken, {
                        ...cookieOptions,
                        maxAge: 1000 * config.TOKENS.ACCESS.EXPIRY
                    })
                    .cookie('refreshToken', isLoggedIn.refreshToken, {
                        ...cookieOptions,
                        maxAge: 1000 * config.TOKENS.REFRESH.EXPIRY
                    })

                httpResponse(response, request, 200, responseMessage.auth.LOGIN_SUCCESSFUL, isLoggedIn)
            }
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    }),
    logout: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { cookies } = request
            const { refreshToken } = (cookies || {}) as {
                refreshToken: string | undefined
            }
            if (refreshToken) {
                await query.deleteToken(refreshToken)
            }

            const isProd =
                config.ENV === EApplicationEnvironment.PRODUCTION ||
                process.env.NODE_ENV === 'production'
            const cookieOptions = {
                path: '/',
                sameSite: isProd ? ('none' as const) : ('lax' as const),
                httpOnly: true,
                secure: isProd
            }

            //Clearing cookies
            response
                .clearCookie('accessToken', cookieOptions)
                .clearCookie('refreshToken', cookieOptions)

            httpResponse(response, request, 200, responseMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, request, 500)
        }
    }),
    googleAuthInitiate: asyncHandler(async (request: Request, response: Response) => {
        try {
            const { role, redirect } = request.query as { role?: string; redirect?: string }
            const googleUrl = googleAuthInitiateService(role, redirect)
            return response.redirect(googleUrl)
        } catch (error: any) {
            const errorMsg = error.message || 'Google OAuth initiation failed'
            return response.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(errorMsg)}`)
        }
    }),
    googleAuthCallback: asyncHandler(async (request: Request, response: Response) => {
        const { code, state, error, error_description } = request.query as {
            code?: string
            state?: string
            error?: string
            error_description?: string
        }

        if (error) {
            const message = error_description || error || 'Google sign-in cancelled'
            return response.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(message)}`)
        }

        if (!code) {
            return response.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent('Missing authorization code from Google')}`)
        }

        try {
            const result = await googleAuthCallbackService(code, state)

            const isProd =
                config.ENV === EApplicationEnvironment.PRODUCTION ||
                process.env.NODE_ENV === 'production'
            const cookieOptions = {
                path: '/',
                sameSite: isProd ? ('none' as const) : ('lax' as const),
                httpOnly: true,
                secure: isProd
            }

            response
                .cookie('accessToken', result.accessToken, {
                    ...cookieOptions,
                    maxAge: 1000 * config.TOKENS.ACCESS.EXPIRY
                })
                .cookie('refreshToken', result.refreshToken, {
                    ...cookieOptions,
                    maxAge: 1000 * config.TOKENS.REFRESH.EXPIRY
                })

            const destination = `${config.FRONTEND_URL}${result.redirectPath}?token=${result.accessToken}`
            return response.redirect(destination)
        } catch (authError: any) {
            const message = authError.message || 'Google authentication failed'
            return response.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(message)}`)
        }
    })
}
