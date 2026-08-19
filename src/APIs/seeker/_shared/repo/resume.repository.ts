import resumeModel from '../models/resume.model'
import { IResume } from '../types/resume.interface'

export default {
    create: (payload: IResume) => {
        return resumeModel.create(payload)
    },
    findById: (id: string) => {
        return resumeModel.findById(id)
    },
    findBySeeker: (seekerId: string) => {
        return resumeModel.find({ seekerId }).sort({ version: -1 })
    },
    findActiveResume: (seekerId: string) => {
        return resumeModel.findOne({ seekerId, isActive: true })
    },
    findLatestVersion: (seekerId: string) => {
        return resumeModel.findOne({ seekerId }).sort({ version: -1 })
    },
    updateActiveState: (seekerId: string, excludeId: string, isActive: boolean) => {
        return resumeModel.updateMany(
            { seekerId, _id: { $ne: excludeId } },
            { $set: { isActive } }
        )
    },
    delete: (id: string) => {
        return resumeModel.findByIdAndDelete(id)
    }
}
