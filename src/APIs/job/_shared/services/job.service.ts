import jobRepository from '../repo/job.repository'
import { IJob } from '../types/job.interface'
import { CustomError } from '../../../../utils/errors'
import { EJobStatus, EPaymentStatus } from '../../../../constant/jobs'

export const createJob = async (companyId: string, data: Partial<IJob>) => {
    // Strip client-supplied protected fields
    const { companyId: _, status: __, paymentStatus: ___, ...jobData } = data as any

    const payload: IJob = {
        ...jobData,
        companyId,
        status: EJobStatus.DRAFT,
        paymentStatus: EPaymentStatus.UNPAID
    }

    return jobRepository.create(payload)
}

export const getCompanyJobs = async (companyId: string, page: number, limit: number) => {
    const jobs = await jobRepository.findByCompanyId(companyId, page, limit)
    const total = await jobRepository.countByCompanyId(companyId)

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

export const getCompanyJobById = async (companyId: string, jobId: string) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }
    return job
}

export const updateJob = async (companyId: string, jobId: string, data: Partial<IJob>) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    // Keep fields like companyId, status, and paymentStatus protected
    const { companyId: _, status: __, paymentStatus: ___, ...allowedData } = data as any

    return jobRepository.update(jobId, allowedData)
}

export const deleteJob = async (companyId: string, jobId: string) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    if (job.status !== EJobStatus.DRAFT) {
        throw new CustomError('Only draft jobs can be deleted', 400)
    }

    await jobRepository.delete(jobId)
    return { success: true }
}

export const closeJob = async (companyId: string, jobId: string) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    if (job.status !== EJobStatus.PUBLISHED) {
        throw new CustomError('Only published jobs can be closed', 400)
    }

    job.status = EJobStatus.CLOSED
    await job.save()
    return job
}

export const publishJob = async (companyId: string, jobId: string) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.companyId.toString() !== companyId.toString()) {
        throw new CustomError('Job not found', 404)
    }

    if (job.paymentStatus !== EPaymentStatus.PAID) {
        throw new CustomError('Cannot publish unpaid job. Payment is required', 400)
    }

    job.status = EJobStatus.PUBLISHED
    await job.save()
    return job
}

export const getPublicJobs = async (queryParams: {
    page: number
    limit: number
    search?: string
    employmentType?: string
    experienceLevel?: string
    workplaceType?: string
    location?: string
}) => {
    const { page, limit, search, employmentType, experienceLevel, workplaceType, location } = queryParams

    const filter: any = {
        status: EJobStatus.PUBLISHED
    }

    if (search) {
        const searchRegex = new RegExp(search, 'i')
        filter.$or = [
            { title: searchRegex },
            { description: searchRegex },
            { skills: searchRegex }
        ]
    }

    if (employmentType) {
        filter.employmentType = employmentType
    }

    if (experienceLevel) {
        filter.experienceLevel = experienceLevel
    }

    if (workplaceType) {
        filter.workplaceType = workplaceType
    }

    if (location) {
        const locationRegex = new RegExp(location, 'i')
        filter.$and = filter.$and || []
        filter.$and.push({
            $or: [
                { 'location.city': locationRegex },
                { 'location.country': locationRegex }
            ]
        })
    }

    const jobs = await jobRepository.queryPublishedJobs(filter, page, limit)
    const total = await jobRepository.countPublishedJobs(filter)

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

export const getPublicJobById = async (jobId: string) => {
    const job = await jobRepository.findById(jobId)
    if (!job || job.status !== EJobStatus.PUBLISHED) {
        throw new CustomError('Job not found', 404)
    }

    // Expose only seeker-facing attributes if needed, but returning standard job is default
    return job
}
