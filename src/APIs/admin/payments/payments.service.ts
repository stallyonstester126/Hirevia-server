import paymentModel from '../../company/_shared/models/payment.model'
import { CustomError } from '../../../utils/errors'

export const getPayments = async (
    page: number = 1,
    limit: number = 10,
    status?: string,
    companyId?: string,
    jobId?: string
) => {
    const filter: any = {}
    if (status) filter.status = status
    if (companyId) filter.companyId = companyId
    if (jobId) filter.jobId = jobId

    const skip = (page - 1) * limit
    const [payments, total] = await Promise.all([
        paymentModel
            .find(filter)
            .populate('companyId', 'name email')
            .populate('jobId', 'title status paymentStatus')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        paymentModel.countDocuments(filter)
    ])

    return {
        payments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export const getPaymentById = async (paymentId: string) => {
    const payment = await paymentModel
        .findById(paymentId)
        .populate('companyId', 'name email')
        .populate('jobId', 'title status paymentStatus')

    if (!payment) {
        throw new CustomError('Payment not found', 404)
    }

    return payment
}
