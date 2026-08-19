import { Document, Types } from 'mongoose'

export interface IResume {
    seekerId: Types.ObjectId | string
    originalFileName: string
    storageKey: string
    mimeType: string
    fileSize: number
    fileExtension: string
    version: number
    isActive: boolean
}

export interface IResumeDocument extends IResume, Document {
    createdAt: Date
    updatedAt: Date
}
