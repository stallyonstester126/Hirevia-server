import applicationModel from '../models/application.model'
import { IApplication } from '../types/application.interface'

export default {
    create: (payload: IApplication) => {
        return applicationModel.create(payload)
    },
    findById: (id: string) => {
        return applicationModel.findById(id)
    },
    findByJobAndSeeker: (jobId: string, seekerId: string) => {
        return applicationModel.findOne({ jobId, seekerId })
    },
    findSeekerApps: (seekerId: string, page: number, limit: number) => {
        return applicationModel.find({ seekerId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'jobId',
                select: 'title companyId location workplaceType employmentType',
                populate: {
                    path: 'companyId',
                    select: 'name email'
                }
            })
            .populate({
                path: 'resumeId',
                select: 'originalFileName version isActive createdAt'
            })
    },
    countSeekerApps: (seekerId: string) => {
        return applicationModel.countDocuments({ seekerId })
    },
    findJobApps: (jobId: string, filters: any, page: number, limit: number) => {
        const query = { ...filters, jobId }
        return applicationModel.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'seekerId',
                select: 'name email'
            })
            .populate({
                path: 'resumeId',
                select: 'originalFileName version isActive createdAt'
            })
    },
    countJobApps: (jobId: string, filters: any) => {
        const query = { ...filters, jobId }
        return applicationModel.countDocuments(query)
    },
    update: (id: string, payload: Partial<IApplication>) => {
        return applicationModel.findByIdAndUpdate(
            id,
            { $set: payload },
            { new: true, runValidators: true }
        )
    }
}
