import testInviteModel from '../models/testInvite.model'
import { ITestInvite, ITestInviteDocument } from '../types/testInvite.interface'

export default {
    create: (payload: ITestInvite): Promise<ITestInviteDocument> => {
        return testInviteModel.create(payload)
    },
    findByToken: (token: string): Promise<ITestInviteDocument | null> => {
        return testInviteModel.findOne({ token })
    },
    findByApplicationId: (applicationId: string): Promise<ITestInviteDocument | null> => {
        return testInviteModel.findOne({ applicationId })
    },
    updateByToken: (token: string, payload: Partial<ITestInvite>): Promise<ITestInviteDocument | null> => {
        return testInviteModel.findOneAndUpdate(
            { token },
            { $set: payload },
            { new: true, runValidators: true }
        )
    },
    updateByApplicationId: (applicationId: string, payload: Partial<ITestInvite>): Promise<ITestInviteDocument | null> => {
        return testInviteModel.findOneAndUpdate(
            { applicationId },
            { $set: payload },
            { new: true, runValidators: true }
        )
    }
}
