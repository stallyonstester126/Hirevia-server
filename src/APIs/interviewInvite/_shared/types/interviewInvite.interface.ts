import { Document, Types } from 'mongoose'

export type TInterviewInviteStatus = 'PENDING' | 'STARTED' | 'COMPLETED' | 'EXPIRED'

export interface IInterviewInvite {
    applicationId: Types.ObjectId | string
    jobId: Types.ObjectId | string
    seekerId: Types.ObjectId | string
    token: string
    status: TInterviewInviteStatus
    vapiCallId?: string | null
    transcript?: string | null
    interviewScore?: number | null
    interviewFeedback?: string | null
    endedReason?: string | null
    tabSwitchCount?: number
    tabSwitchDuration?: number
    startedAt?: Date | null
    completedAt?: Date | null
    expiresAt: Date
}

export interface IInterviewInviteDocument extends IInterviewInvite, Document {
    createdAt: Date
    updatedAt: Date
}
