import joi from 'joi'
import { IJob } from '../../../../APIs/job/_shared/types/job.interface'
import { EEmploymentType, EExperienceLevel, EWorkplaceType } from '../../../../constant/jobs'

const locationSchema = joi.object({
    city: joi.string().min(2).max(100).trim().required(),
    country: joi.string().min(2).max(100).trim().required()
})

const salarySchema = joi.object({
    min: joi.number().min(0).required(),
    max: joi.number().min(joi.ref('min')).required(), // enforce max >= min
    currency: joi.string().min(1).max(10).trim().required(),
    period: joi.string().trim().required()
})

export const createJobSchema = joi.object<Omit<IJob, 'companyId' | 'status' | 'paymentStatus'>, true>({
    title: joi.string().min(2).max(100).trim().required(),
    description: joi.string().trim().required(),
    responsibilities: joi.array().items(joi.string().trim()).optional(),
    requirements: joi.array().items(joi.string().trim()).optional(),
    skills: joi.array().items(joi.string().trim()).optional(),
    employmentType: joi.string().valid(...Object.values(EEmploymentType)).required(),
    experienceLevel: joi.string().valid(...Object.values(EExperienceLevel)).required(),
    location: locationSchema.required(),
    workplaceType: joi.string().valid(...Object.values(EWorkplaceType)).required(),
    salary: salarySchema.required()
})

export const updateJobSchema = joi.object<Partial<Omit<IJob, 'companyId' | 'status' | 'paymentStatus'>>, true>({
    title: joi.string().min(2).max(100).trim().optional(),
    description: joi.string().trim().optional(),
    responsibilities: joi.array().items(joi.string().trim()).optional(),
    requirements: joi.array().items(joi.string().trim()).optional(),
    skills: joi.array().items(joi.string().trim()).optional(),
    employmentType: joi.string().valid(...Object.values(EEmploymentType)).optional(),
    experienceLevel: joi.string().valid(...Object.values(EExperienceLevel)).optional(),
    location: locationSchema.optional(),
    workplaceType: joi.string().valid(...Object.values(EWorkplaceType)).optional(),
    salary: salarySchema.optional()
})
