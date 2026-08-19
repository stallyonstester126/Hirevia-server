import mongoose, { Schema } from 'mongoose'
import { IResumeDocument } from '../types/resume.interface'

const resumeSchema = new Schema<IResumeDocument>(
    {
        seekerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        originalFileName: {
            type: String,
            required: true,
            trim: true
        },
        storageKey: {
            type: String,
            required: true,
            trim: true
        },
        mimeType: {
            type: String,
            required: true,
            trim: true
        },
        fileSize: {
            type: Number,
            required: true
        },
        fileExtension: {
            type: String,
            required: true,
            trim: true
        },
        version: {
            type: Number,
            required: true,
            default: 1
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true
        }
    },
    { timestamps: true }
)

// Index mappings for fast search & version lookups
resumeSchema.index({ seekerId: 1 })
resumeSchema.index({ seekerId: 1, version: 1 }, { unique: true })
resumeSchema.index({ seekerId: 1, isActive: 1 })

export default mongoose.model<IResumeDocument>('Resume', resumeSchema)
