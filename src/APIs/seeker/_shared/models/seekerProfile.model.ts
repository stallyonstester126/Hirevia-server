import mongoose, { Schema } from 'mongoose'
import { ISeekerProfileDocument } from '../types/seekerProfile.interface'

const experienceSchema = new Schema({
    company: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    description: { type: String, trim: true, default: '' }
}, { _id: false })

const educationSchema = new Schema({
    institution: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null }
}, { _id: false })

const seekerProfileSchema = new Schema<ISeekerProfileDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        headline: {
            type: String,
            trim: true,
            default: ''
        },
        bio: {
            type: String,
            trim: true,
            default: ''
        },
        location: {
            type: String,
            trim: true,
            default: ''
        },
        skills: {
            type: [String],
            default: []
        },
        experience: {
            type: [experienceSchema],
            default: []
        },
        education: {
            type: [educationSchema],
            default: []
        }
    },
    { timestamps: true }
)

export default mongoose.model<ISeekerProfileDocument>('SeekerProfile', seekerProfileSchema)
