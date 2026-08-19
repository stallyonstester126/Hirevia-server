import joi from 'joi'

export const getSeekerApplicationsQuerySchema = joi.object({
    page: joi.number().integer().min(1).default(1).optional(),
    limit: joi.number().integer().min(1).max(100).default(10).optional()
})

export const applyJobSchema = joi.object({
    resumeId: joi.string().hex().length(24).required(),
    coverLetter: joi.string().trim().max(5000).allow('').optional()
})
