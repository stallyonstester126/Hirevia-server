import seekerProfileRepository from '../_shared/repo/seekerProfile.repository'
import { ISeekerProfile } from '../_shared/types/seekerProfile.interface'
import { CustomError } from '../../../utils/errors'

export const getProfileByUserId = async (userId: string) => {
    const profile = await seekerProfileRepository.findByUserId(userId)
    if (!profile) {
        throw new CustomError('Seeker profile not found', 404)
    }
    return profile
}

export const createSeekerProfile = async (userId: string, data: ISeekerProfile) => {
    const existingProfile = await seekerProfileRepository.findByUserId(userId)
    if (existingProfile) {
        throw new CustomError('Seeker profile already exists', 409)
    }

    const payload = {
        ...data,
        userId
    }

    return seekerProfileRepository.createProfile(payload)
}

export const updateSeekerProfile = async (userId: string, data: Partial<ISeekerProfile>) => {
    const existingProfile = await seekerProfileRepository.findByUserId(userId)
    if (!existingProfile) {
        throw new CustomError('Seeker profile not found', 404)
    }

    // Keep fields like userId, createdAt, updatedAt protected
    const { userId: _, ...allowedData } = data as any

    return seekerProfileRepository.updateProfile(userId, allowedData)
}
