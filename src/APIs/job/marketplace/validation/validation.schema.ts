import joi from 'joi'
import { EEmploymentType, EExperienceLevel, EWorkplaceType } from '../../../../constant/jobs'

export const getPublicJobsQuerySchema = joi.object({
    page: joi.number().integer().min(1).default(1).optional(),
    limit: joi.number().integer().min(1).max(100).default(12).optional(),
    search: joi.string().trim().allow('').optional(),
    employmentType: joi.string().valid(...Object.values(EEmploymentType)).optional(),
    experienceLevel: joi.string().valid(...Object.values(EExperienceLevel)).optional(),
    workplaceType: joi.string().valid(...Object.values(EWorkplaceType)).optional(),
    location: joi.string().trim().allow('').optional()
})
