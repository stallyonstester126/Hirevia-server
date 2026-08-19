import joi from 'joi'
import { ICompanyProfile } from '../../_shared/types/companyProfile.interface'

export const createCompanyProfileSchema = joi.object<Omit<ICompanyProfile, 'userId'>, true>({
    companyName: joi.string().min(2).max(100).trim().required(),
    description: joi.string().trim().allow('').optional(),
    website: joi.string().uri().trim().allow('').optional(),
    industry: joi.string().trim().allow('').optional(),
    location: joi.string().trim().allow('').optional(),
    phone: joi.string().trim().allow('').optional(),
    logoUrl: joi.string().uri().trim().allow('').optional()
})

export const updateCompanyProfileSchema = joi.object<Partial<Omit<ICompanyProfile, 'userId'>>, true>({
    companyName: joi.string().min(2).max(100).trim().optional(),
    description: joi.string().trim().allow('').optional(),
    website: joi.string().uri().trim().allow('').optional(),
    industry: joi.string().trim().allow('').optional(),
    location: joi.string().trim().allow('').optional(),
    phone: joi.string().trim().allow('').optional(),
    logoUrl: joi.string().uri().trim().allow('').optional()
})
