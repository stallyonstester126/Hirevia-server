import mongoose, { Schema } from 'mongoose'
import { ICVAnalysisDocument } from '../types/cvAnalysis.interface'
import { EExperienceLevel } from '../../../../constant/jobs'

const cvAnalysisSchema = new Schema<ICVAnalysisDocument>(
    {
        resumeId: {
            type: Schema.Types.ObjectId,
            ref: 'Resume',
            required: true,
            unique: true
        },
        seekerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        extractedSkills: {
            type: [String],
            required: true,
            default: []
        },
        experienceSummary: {
            type: String,
            required: true,
            trim: true
        },
        educationSummary: {
            type: String,
            required: true,
            trim: true
        },
        estimatedExperienceLevel: {
            type: String,
            required: true,
            enum: EExperienceLevel
        },
        suggestions: {
            type: [String],
            required: true,
            default: []
        },
        rawProviderResponse: {
            type: Schema.Types.Mixed
        },
        status: {
            type: String,
            required: true,
            enum: ['PENDING', 'COMPLETE', 'FAILED'],
            default: 'PENDING'
        }
    },
    { timestamps: true }
)

cvAnalysisSchema.index({ resumeId: 1 })
cvAnalysisSchema.index({ seekerId: 1 })

export default mongoose.model<ICVAnalysisDocument>('CVAnalysis', cvAnalysisSchema)
