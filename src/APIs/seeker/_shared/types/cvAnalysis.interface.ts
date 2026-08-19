import { Document, Types } from 'mongoose'

export interface ICVAnalysis {
    resumeId: Types.ObjectId | string
    seekerId: Types.ObjectId | string
    extractedSkills: string[]
    experienceSummary: string
    educationSummary: string
    estimatedExperienceLevel: string
    suggestions: string[]
    rawProviderResponse?: any
    status: 'PENDING' | 'COMPLETE' | 'FAILED'
}

export interface ICVAnalysisDocument extends ICVAnalysis, Document {
    createdAt: Date
    updatedAt: Date
}
