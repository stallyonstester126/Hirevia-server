import { Request } from 'express'
import { EUserRoles } from '../../../../constant/users'

export interface IRegisterRequest {
    name: string
    email: string
    phoneNumber: string
    password: string
    consent: boolean
    role: EUserRoles
}

export interface IRegister extends Request {
    body: IRegisterRequest
}

export interface IConfirmRegistration extends Request {
    params: {
        token: string
    }
    query: {
        code: string
    }
}

export interface ILoginRequest {
    email: string
    password: string
}

export interface ILogin extends Request {
    body: ILoginRequest
}

export interface IForgotPasswordRequest {
    email: string
}

export interface IForgotPassword extends Request {
    body: IForgotPasswordRequest
}

export interface IResetPasswordRequest {
    token: string
    newPassword: string
    code?: string
}

export interface IResetPassword extends Request {
    body: IResetPasswordRequest
}
