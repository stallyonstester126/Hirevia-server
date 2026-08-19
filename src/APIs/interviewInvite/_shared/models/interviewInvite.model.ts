import mongoose, { Schema } from 'mongoose'
import { IInterviewInviteDocument } from '../types/interviewInvite.interface'

const interviewInviteSchema = new Schema<IInterviewInviteDocument>(
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
        vapiCallId: {
            type: String,
            default: null,
            trim: true
        },
        transcript: {
            type: String,
            default: null
        },
        interviewScore: {
            type: Number,
            default: null
        },
        interviewFeedback: {
            type: String,
            default: null
        },
        endedReason: {
            type: String,
            default: null,
            trim: true
        },
        tabSwitchCount: {
            type: Number,
            default: 0
        },
        tabSwitchDuration: {
            type: Number,
            default: 0
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
        }
    },
    { timestamps: true }
)

interviewInviteSchema.index({ token: 1 }, { unique: true })
interviewInviteSchema.index({ applicationId: 1 }, { unique: true })
interviewInviteSchema.index({ jobId: 1 })
interviewInviteSchema.index({ seekerId: 1 })
interviewInviteSchema.index({ vapiCallId: 1 })
interviewInviteSchema.index({ status: 1 })

export default mongoose.model<IInterviewInviteDocument>('InterviewInvite', interviewInviteSchema)
