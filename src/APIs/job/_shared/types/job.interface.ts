import { Document, Types } from 'mongoose'
import { EEmploymentType, EExperienceLevel, EJobStatus, EPaymentStatus, EWorkplaceType } from '../../../../constant/jobs'

export interface ILocation {
    city: string
    country: string
}

export interface ISalary {
    min: number
    max: number
    currency: string
    period: string
}

export interface IJob {
    companyId: Types.ObjectId | string
    title: string
    description: string
    responsibilities: string[]
    requirements: string[]
    skills: string[]
    employmentType: EEmploymentType
    experienceLevel: EExperienceLevel
    location: ILocation
    workplaceType: EWorkplaceType
    salary: ISalary
    status: EJobStatus
    paymentStatus: EPaymentStatus
}

export interface IJobDocument extends IJob, Document {
    createdAt: Date
    updatedAt: Date
}
