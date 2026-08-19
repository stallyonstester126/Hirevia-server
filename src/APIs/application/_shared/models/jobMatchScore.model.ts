import mongoose, { Schema } from 'mongoose'
import { IJobMatchScoreDocument } from '../types/jobMatchScore.interface'

const jobMatchScoreSchema = new Schema<IJobMatchScoreDocument>(
    {
        applicationId: {
            type: Schema.Types.ObjectId,
            ref: 'Application',
            required: true,
            unique: true
        },
        resumeId: {
            type: Schema.Types.ObjectId,
            ref: 'Resume',
            required: true
        },
        jobId: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: true
        },
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        rationale: {
            type: String,
            required: true,
            trim: true
        },
        generatedAt: {
            type: Date,
            required: true,
            default: Date.now
        }
    },
    { timestamps: true }
)

jobMatchScoreSchema.index({ applicationId: 1 })
jobMatchScoreSchema.index({ resumeId: 1 })
jobMatchScoreSchema.index({ jobId: 1 })

export default mongoose.model<IJobMatchScoreDocument>('JobMatchScore', jobMatchScoreSchema)
