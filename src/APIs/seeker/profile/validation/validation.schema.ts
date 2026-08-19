import joi from 'joi'
import { ISeekerProfile, IExperience, IEducation } from '../../_shared/types/seekerProfile.interface'

const experienceSchema = joi.object<IExperience>({
    company: joi.string().min(2).max(100).trim().required(),
    position: joi.string().min(2).max(100).trim().required(),
    startDate: joi.date().iso().required(),
    endDate: joi.date().iso().allow(null).optional(),
    description: joi.string().trim().allow('').optional()
})

const educationSchema = joi.object<IEducation>({
    institution: joi.string().min(2).max(100).trim().required(),
    degree: joi.string().min(2).max(100).trim().required(),
    startDate: joi.date().iso().required(),
    endDate: joi.date().iso().allow(null).optional()
})

export const createSeekerProfileSchema = joi.object<Omit<ISeekerProfile, 'userId'>, true>({
    headline: joi.string().trim().allow('').optional(),
    bio: joi.string().trim().allow('').optional(),
    location: joi.string().trim().allow('').optional(),
    skills: joi.array().items(joi.string().trim()).optional(),
    experience: joi.array().items(experienceSchema).optional(),
    education: joi.array().items(educationSchema).optional()
})

export const updateSeekerProfileSchema = joi.object<Partial<Omit<ISeekerProfile, 'userId'>>, true>({
    headline: joi.string().trim().allow('').optional(),
    bio: joi.string().trim().allow('').optional(),
    location: joi.string().trim().allow('').optional(),
    skills: joi.array().items(joi.string().trim()).optional(),
    experience: joi.array().items(experienceSchema).optional(),
    education: joi.array().items(educationSchema).optional()
})
