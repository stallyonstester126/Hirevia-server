import { Document, Types } from 'mongoose'

export type TTestInviteStatus = 'PENDING' | 'STARTED' | 'COMPLETED' | 'EXPIRED'

export interface ITestResponse {
    question: string
    answer: string
}

export interface ITestInvite {
    applicationId: Types.ObjectId | string
    jobId: Types.ObjectId | string
    seekerId: Types.ObjectId | string
    token: string
    status: TTestInviteStatus
    startedAt?: Date | null
    completedAt?: Date | null
    expiresAt: Date
    responses?: ITestResponse[]
    assessmentScore?: number | null
    assessmentFeedback?: string | null
}

export interface ITestInviteDocument extends ITestInvite, Document {
    createdAt: Date
    updatedAt: Date
}
