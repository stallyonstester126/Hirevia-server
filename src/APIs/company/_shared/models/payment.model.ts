import mongoose, { Schema } from 'mongoose'
import { IPaymentDocument } from '../types/payment.interface'

const paymentSchema = new Schema<IPaymentDocument>(
    {
        jobId: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: false,
            default: null
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        stripeSessionId: {
            type: String,
            required: true,
            unique: true
        },
        stripePaymentIntentId: {
            type: String,
            trim: true
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            default: 'usd'
        },
        status: {
            type: String,
            required: true,
            enum: ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'],
            default: 'PENDING'
        },
        type: {
            type: String,
            enum: ['SUBSCRIPTION', 'JOB_POSTING'],
            default: 'SUBSCRIPTION'
        },
        paidAt: {
            type: Date
        }
    },
    { timestamps: true }
)

paymentSchema.index({ jobId: 1 })
paymentSchema.index({ companyId: 1 })
paymentSchema.index({ stripeSessionId: 1 }, { unique: true })

export default mongoose.model<IPaymentDocument>('Payment', paymentSchema)
