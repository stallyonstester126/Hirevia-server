import { Document, Types } from 'mongoose'

export interface IJobMatchScore {
    applicationId: Types.ObjectId | string
    resumeId: Types.ObjectId | string
    jobId: Types.ObjectId | string
    score: number
    rationale: string
    generatedAt: Date
}

export interface IJobMatchScoreDocument extends IJobMatchScore, Document {
    createdAt: Date
    updatedAt: Date
}
