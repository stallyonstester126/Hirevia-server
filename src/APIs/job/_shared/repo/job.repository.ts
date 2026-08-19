import jobModel from '../models/job.model'
import { IJob } from '../types/job.interface'

export default {
    create: (payload: IJob) => {
        return jobModel.create(payload)
    },
    findById: (id: string) => {
        return jobModel.findById(id)
    },
    findByCompanyId: (companyId: string, page: number, limit: number) => {
        return jobModel.find({ companyId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
    },
    countByCompanyId: (companyId: string) => {
        return jobModel.countDocuments({ companyId })
    },
    update: (id: string, payload: Partial<IJob>) => {
        return jobModel.findByIdAndUpdate(
            id,
            { $set: payload },
            { new: true, runValidators: true }
        )
    },
    delete: (id: string) => {
        return jobModel.findByIdAndDelete(id)
    },
    queryPublishedJobs: (queryFilters: any, page: number, limit: number) => {
        return jobModel.find(queryFilters)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
    },
    countPublishedJobs: (queryFilters: any) => {
        return jobModel.countDocuments(queryFilters)
    }
}
