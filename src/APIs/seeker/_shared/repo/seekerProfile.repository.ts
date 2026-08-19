import seekerProfileModel from '../models/seekerProfile.model'
import { ISeekerProfile } from '../types/seekerProfile.interface'

export default {
    findByUserId: (userId: string) => {
        return seekerProfileModel.findOne({ userId })
    },
    createProfile: (payload: ISeekerProfile) => {
        return seekerProfileModel.create(payload)
    },
    updateProfile: (userId: string, payload: Partial<ISeekerProfile>) => {
        return seekerProfileModel.findOneAndUpdate(
            { userId },
            { $set: payload },
            { new: true, runValidators: true }
        )
    }
}
