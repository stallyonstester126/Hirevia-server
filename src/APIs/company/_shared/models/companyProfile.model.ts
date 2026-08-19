import mongoose, { Schema } from 'mongoose'
import { ICompanyProfileDocument } from '../types/companyProfile.interface'

const companyProfileSchema = new Schema<ICompanyProfileDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        companyName: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        website: {
            type: String,
            trim: true,
            default: ''
        },
        industry: {
            type: String,
            trim: true,
            default: ''
        },
        location: {
            type: String,
            trim: true,
            default: ''
        },
        phone: {
            type: String,
            trim: true,
            default: ''
        },
        logoUrl: {
            type: String,
            trim: true,
            default: ''
        }
    },
    { timestamps: true }
)

export default mongoose.model<ICompanyProfileDocument>('CompanyProfile', companyProfileSchema)
