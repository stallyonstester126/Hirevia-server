import { Document, Types } from 'mongoose'

export interface IPayment {
    jobId: Types.ObjectId | string
    companyId: Types.ObjectId | string
    stripeSessionId: string
    stripePaymentIntentId?: string
    amount: number
    currency: string
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
    paidAt?: Date
}

export interface IPaymentDocument extends IPayment, Document {
    createdAt: Date
    updatedAt: Date
}
