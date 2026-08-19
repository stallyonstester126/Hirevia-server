import jobModel from '../../job/_shared/models/job.model'
import applicationModel from '../../application/_shared/models/application.model'
import { CustomError } from '../../../utils/errors'
import { EJobStatus } from '../../../constant/jobs'

export const getJobs = async (
    page: number = 1,
    limit: number = 10,
    status?: EJobStatus,
    companyId?: string
) => {
    const filter: any = {}
    if (status) {
        filter.status = status
    }
    if (companyId) {
        filter.companyId = companyId
    }

    const skip = (page - 1) * limit
    const [jobs, total] = await Promise.all([
        jobModel
            .find(filter)
            .populate('companyId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        jobModel.countDocuments(filter)
    ])

    return {
        jobs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export const getJobById = async (jobId: string) => {
    const job = await jobModel.findById(jobId).populate('companyId', 'name email')
    if (!job) {
        throw new CustomError('Job not found', 404)
    }
    return job
}

export const closeJob = async (jobId: string) => {
    const job = await jobModel.findById(jobId)
    if (!job) {
        throw new CustomError('Job not found', 404)
    }

    if (job.status === EJobStatus.CLOSED) {
        return job
    }

    job.status = EJobStatus.CLOSED
    await job.save()
    return job
}

export const deleteJob = async (jobId: string) => {
    const job = await jobModel.findById(jobId)
    if (!job) {
        throw new CustomError('Job not found', 404)
    }

    // Safety rule (Option A): Block deletion if applications exist to prevent orphaned references
    const applicationCount = await applicationModel.countDocuments({ jobId })
    if (applicationCount > 0) {
        throw new CustomError(
            'Cannot delete job with existing applications. Please close the job instead.',
            400
        )
    }

    await jobModel.findByIdAndDelete(jobId)
    return { success: true, message: 'Job deleted successfully' }
}
