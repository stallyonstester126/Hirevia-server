import mongoose, { Schema } from 'mongoose'
import { ITestInviteDocument } from '../types/testInvite.interface'

const responseSchema = new Schema(
    {
        question: {
            type: String,
            required: true,
            trim: true
        },
        answer: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
)

const testInviteSchema = new Schema<ITestInviteDocument>(
    {
        applicationId: {
            type: Schema.Types.ObjectId,
            ref: 'Application',
            required: true,
            unique: true
        },
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
        token: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'STARTED', 'COMPLETED', 'EXPIRED'],
            default: 'PENDING',
            required: true
        },
        startedAt: {
            type: Date,
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        },
        expiresAt: {
            type: Date,
            required: true
        },
        responses: {
            type: [responseSchema],
            default: []
        },
        assessmentScore: {
            type: Number,
            default: null
        },
        assessmentFeedback: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
)

testInviteSchema.index({ token: 1 }, { unique: true })
testInviteSchema.index({ applicationId: 1 }, { unique: true })
testInviteSchema.index({ jobId: 1 })
testInviteSchema.index({ seekerId: 1 })
testInviteSchema.index({ status: 1 })

export default mongoose.model<ITestInviteDocument>('TestInvite', testInviteSchema)
