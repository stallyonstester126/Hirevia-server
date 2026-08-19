import mongoose, { Schema } from 'mongoose'
import { IJobDocument } from '../types/job.interface'
import { EEmploymentType, EExperienceLevel, EJobStatus, EPaymentStatus, EWorkplaceType } from '../../../../constant/jobs'

const locationSchema = new Schema(
    {
        city: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true }
    },
    { _id: false }
)

const salarySchema = new Schema(
    {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        currency: { type: String, required: true, default: 'USD', trim: true },
        period: { type: String, required: true, default: 'MONTHLY', trim: true }
    },
    { _id: false }
)

const jobSchema = new Schema<IJobDocument>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        responsibilities: {
            type: [String],
            default: []
        },
        requirements: {
            type: [String],
            default: []
        },
        skills: {
            type: [String],
            default: []
        },
        employmentType: {
            type: String,
            required: true,
            enum: EEmploymentType
        },
        experienceLevel: {
            type: String,
            required: true,
            enum: EExperienceLevel
        },
        location: {
            type: locationSchema,
            required: true
        },
        workplaceType: {
            type: String,
            required: true,
            enum: EWorkplaceType
        },
        salary: {
            type: salarySchema,
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: EJobStatus,
            default: EJobStatus.DRAFT
        },
        paymentStatus: {
            type: String,
            required: true,
            enum: EPaymentStatus,
            default: EPaymentStatus.UNPAID
        }
    },
    { timestamps: true }
)

// Add indexes for efficient querying
jobSchema.index({ companyId: 1 })
jobSchema.index({ status: 1 })
jobSchema.index({ createdAt: -1 })

export default mongoose.model<IJobDocument>('Job', jobSchema)
