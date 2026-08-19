import mongoose, { Schema } from 'mongoose'
import { IApplicationDocument } from '../types/application.interface'
import { EApplicationStatus } from '../../../../constant/applications'

const applicationSchema = new Schema<IApplicationDocument>(
    {
        jobId: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: true
        },
        seekerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        resumeId: {
            type: Schema.Types.ObjectId,
            ref: 'Resume',
            default: null
        },
        coverLetter: {
            type: String,
            trim: true,
            default: ''
        },
        status: {
            type: String,
            required: true,
            enum: EApplicationStatus,
            default: EApplicationStatus.SUBMITTED
        },
        appliedAt: {
            type: Date,
            required: true,
            default: Date.now
        },
        autoScreeningStatus: {
            type: String,
            enum: ['PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'SKIPPED'],
            default: 'PENDING'
        },
        autoScreeningScore: {
            type: Number,
            default: null
        },
        autoScreeningRationale: {
            type: String,
            default: null
        },
        advancedBy: {
            type: String,
            enum: ['SYSTEM_AI', 'COMPANY', null],
            default: null
        }
    },
    { timestamps: true }
)

// Compound index to guarantee uniqueness at the database level
applicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true })

// Individual indexes for performance
applicationSchema.index({ jobId: 1 })
applicationSchema.index({ seekerId: 1 })
applicationSchema.index({ status: 1 })
applicationSchema.index({ autoScreeningStatus: 1 })
applicationSchema.index({ createdAt: -1 })

export default mongoose.model<IApplicationDocument>('Application', applicationSchema)
