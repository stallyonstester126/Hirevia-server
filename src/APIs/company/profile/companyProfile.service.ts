import companyProfileRepository from '../_shared/repo/companyProfile.repository'
import { ICompanyProfile } from '../_shared/types/companyProfile.interface'
import { CustomError } from '../../../utils/errors'

export const getProfileByUserId = async (userId: string) => {
    const profile = await companyProfileRepository.findByUserId(userId)
    if (!profile) {
        throw new CustomError('Company profile not found', 404)
    }
    return profile
}

export const createCompanyProfile = async (userId: string, data: ICompanyProfile) => {
    const existingProfile = await companyProfileRepository.findByUserId(userId)
    if (existingProfile) {
        throw new CustomError('Company profile already exists', 409)
    }

    const payload = {
        ...data,
        userId
    }

    return companyProfileRepository.createProfile(payload)
}

export const updateCompanyProfile = async (userId: string, data: Partial<ICompanyProfile>) => {
    const existingProfile = await companyProfileRepository.findByUserId(userId)
    if (!existingProfile) {
        throw new CustomError('Company profile not found', 404)
    }

    // Keep fields like userId, createdAt, updatedAt protected
    const { userId: _, ...allowedData } = data as any

    return companyProfileRepository.updateProfile(userId, allowedData)
}
