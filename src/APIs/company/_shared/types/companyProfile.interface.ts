import { Document, Types } from 'mongoose'

export interface ICompanyProfile {
    userId: Types.ObjectId | string
    companyName: string
    description?: string
    website?: string
    industry?: string
    location?: string
    phone?: string
    logoUrl?: string
}

export interface ICompanyProfileDocument extends ICompanyProfile, Document {
    createdAt: Date
    updatedAt: Date
}
