import cvAnalysisModel from '../models/cvAnalysis.model'
import { ICVAnalysis } from '../types/cvAnalysis.interface'

export default {
    create: (payload: ICVAnalysis) => {
        return cvAnalysisModel.create(payload)
    },
    findByResumeId: (resumeId: string) => {
        return cvAnalysisModel.findOne({ resumeId })
    },
    update: (resumeId: string, payload: Partial<ICVAnalysis>) => {
        return cvAnalysisModel.findOneAndUpdate(
            { resumeId },
            { $set: payload },
            { new: true, upsert: true, runValidators: true }
        )
    },
    delete: (id: string) => {
        return cvAnalysisModel.findByIdAndDelete(id)
    }
}
