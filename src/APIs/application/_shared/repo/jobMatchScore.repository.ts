import jobMatchScoreModel from '../models/jobMatchScore.model'
import { IJobMatchScore } from '../types/jobMatchScore.interface'

export default {
    create: (payload: IJobMatchScore) => {
        return jobMatchScoreModel.create(payload)
    },
    findByApplicationId: (applicationId: string) => {
        return jobMatchScoreModel.findOne({ applicationId })
    },
    update: (applicationId: string, payload: Partial<IJobMatchScore>) => {
        return jobMatchScoreModel.findOneAndUpdate(
            { applicationId },
            { $set: payload },
            { new: true, upsert: true, runValidators: true }
        )
    },
    delete: (id: string) => {
        return jobMatchScoreModel.findByIdAndDelete(id)
    }
}
