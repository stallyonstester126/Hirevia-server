import companyProfileModel from '../models/companyProfile.model'
import { ICompanyProfile } from '../types/companyProfile.interface'

export default {
    findByUserId: (userId: string) => {
        return companyProfileModel.findOne({ userId })
    },
    createProfile: (payload: ICompanyProfile) => {
        return companyProfileModel.create(payload)
    },
    updateProfile: (userId: string, payload: Partial<ICompanyProfile>) => {
        return companyProfileModel.findOneAndUpdate(
            { userId },
            { $set: payload },
            { new: true, runValidators: true }
        )
    }
}
