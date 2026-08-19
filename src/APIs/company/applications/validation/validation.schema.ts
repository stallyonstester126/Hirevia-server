import joi from 'joi'
import { EApplicationStatus } from '../../../../constant/applications'

export const getCompanyApplicationsQuerySchema = joi.object({
    page: joi.number().integer().min(1).default(1).optional(),
    limit: joi.number().integer().min(1).max(100).default(20).optional(),
    status: joi.string().valid(...Object.values(EApplicationStatus)).optional()
})

export const updateApplicationStatusSchema = joi.object({
    status: joi.string().valid(...Object.values(EApplicationStatus)).required()
})
