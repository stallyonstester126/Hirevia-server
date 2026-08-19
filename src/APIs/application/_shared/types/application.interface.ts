import { Document, Types } from 'mongoose'
import { EApplicationStatus } from '../../../../constant/applications'

export type TAutoScreeningStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'SKIPPED'
export type TAdvancedBy = 'SYSTEM_AI' | 'COMPANY'

export interface IApplication {
    jobId: Types.ObjectId | string
    seekerId: Types.ObjectId | string
    resumeId?: Types.ObjectId | string | null
    coverLetter?: string
    status: EApplicationStatus
    appliedAt: Date
    autoScreeningStatus?: TAutoScreeningStatus
    autoScreeningScore?: number | null
    autoScreeningRationale?: string | null
    advancedBy?: TAdvancedBy | null
}

export interface IApplicationDocument extends IApplication, Document {
    createdAt: Date
    updatedAt: Date
}
