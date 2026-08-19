import paymentModel from '../models/payment.model'
import { IPayment } from '../types/payment.interface'

export default {
    create: (payload: IPayment) => {
        return paymentModel.create(payload)
    },
    findBySessionId: (stripeSessionId: string) => {
        return paymentModel.findOne({ stripeSessionId })
    },
    findByJobId: (jobId: string) => {
        return paymentModel.findOne({ jobId })
    },
    findPendingOrSucceededByJob: (jobId: string) => {
        return paymentModel.findOne({
            jobId,
            status: { $in: ['PENDING', 'SUCCEEDED'] }
        })
    },
    updateBySessionId: (stripeSessionId: string, payload: Partial<IPayment>) => {
        return paymentModel.findOneAndUpdate(
            { stripeSessionId },
            { $set: payload },
            { new: true, runValidators: true }
        )
    }
}
