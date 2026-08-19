import { Document, Types } from 'mongoose'

export interface IExperience {
    company: string
    position: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string
}

export interface IEducation {
    institution: string
    degree: string
    startDate: Date | string
    endDate?: Date | string | null
}

export interface ISeekerProfile {
    userId: Types.ObjectId | string
    headline?: string
    bio?: string
    location?: string
    skills?: string[]
    experience?: IExperience[]
    education?: IEducation[]
}

export interface ISeekerProfileDocument extends ISeekerProfile, Document {
    createdAt: Date
    updatedAt: Date
}
