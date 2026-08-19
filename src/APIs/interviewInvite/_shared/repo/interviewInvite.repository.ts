import InterviewInviteModel from '../models/interviewInvite.model'
import { IInterviewInvite, IInterviewInviteDocument } from '../types/interviewInvite.interface'

export default {
    create: async (data: IInterviewInvite): Promise<IInterviewInviteDocument> => {
        return InterviewInviteModel.create(data)
    },

    findByToken: async (token: string): Promise<IInterviewInviteDocument | null> => {
        return InterviewInviteModel.findOne({ token })
    },

    findByApplicationId: async (applicationId: string): Promise<IInterviewInviteDocument | null> => {
        return InterviewInviteModel.findOne({ applicationId })
    },

    findByVapiCallId: async (vapiCallId: string): Promise<IInterviewInviteDocument | null> => {
        return InterviewInviteModel.findOne({ vapiCallId })
    },

    updateById: async (
        id: string,
        data: Partial<IInterviewInvite>
    ): Promise<IInterviewInviteDocument | null> => {
        return InterviewInviteModel.findByIdAndUpdate(id, data, { new: true })
    }
}
