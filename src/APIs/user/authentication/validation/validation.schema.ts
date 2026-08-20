import joi from 'joi'
import { ILoginRequest, IRegisterRequest } from '../types/authentication.interface'
import { EUserRoles } from '../../../../constant/users'

export const registerSchema = joi.object<IRegisterRequest, true>({
    name: joi.string().min(2).max(72).trim().required(),
    email: joi.string().email().required(),
    phoneNumber: joi.string().min(4).max(20).required(),
    password: joi
        .string()
        .min(8)
        .max(24)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/)
        .trim()
        .required(),
    consent: joi.boolean().valid(true).required(),
    role: joi.string().valid(EUserRoles.SEEKER, EUserRoles.COMPANY).required()
})

export const loginSchema = joi.object<ILoginRequest, true>({
    email: joi.string().email().required(),
    password: joi
        .string()
        .min(8)
        .max(24)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/)
        .trim()
        .required()
})

export const forgotPasswordSchema = joi.object({
    email: joi.string().email().required().trim()
})

export const verifyResetCodeSchema = joi.object({
    code: joi.string().length(6).required().trim()
})

export const resetPasswordSchema = joi.object({
    token: joi.string().allow('', null).optional().trim(),
    email: joi.string().email().allow('', null).optional().trim(),
    newPassword: joi
        .string()
        .min(8)
        .max(24)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/)
        .trim()
        .required(),
    code: joi.string().allow('', null).optional().trim()
})

