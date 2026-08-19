import applicationModel from '../../application/_shared/models/application.model'
import seekerProfileModel from '../../seeker/_shared/models/seekerProfile.model'
import cvAnalysisModel from '../../seeker/_shared/models/cvAnalysis.model'
import jobMatchScoreModel from '../../application/_shared/models/jobMatchScore.model'
import testInviteModel from '../../testInvite/_shared/models/testInvite.model'
import interviewInviteModel from '../../interviewInvite/_shared/models/interviewInvite.model'
import { CustomError } from '../../../utils/errors'
import { EApplicationStatus } from '../../../constant/applications'

export const getApplications = async (
    page: number = 1,
    limit: number = 10,
    status?: EApplicationStatus,
    jobId?: string,
    seekerId?: string,
    autoScreeningStatus?: string
) => {
    const filter: any = {}
    if (status) filter.status = status
    if (jobId) filter.jobId = jobId
    if (seekerId) filter.seekerId = seekerId
    if (autoScreeningStatus) filter.autoScreeningStatus = autoScreeningStatus

    const skip = (page - 1) * limit
    const [applications, total] = await Promise.all([
        applicationModel
            .find(filter)
            .populate({
                path: 'jobId',
                select: 'title companyId location employmentType workplaceType',
                populate: { path: 'companyId', select: 'name email' }
            })
            .populate('seekerId', 'name email')
            .populate('resumeId', 'originalFileName version isActive')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        applicationModel.countDocuments(filter)
    ])

    return {
        applications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export const getApplicationCaseFile = async (applicationId: string) => {
    const application = await applicationModel
        .findById(applicationId)
        .populate({
            path: 'jobId',
            populate: { path: 'companyId', select: 'name email' }
        })
        .populate('seekerId', 'name email phoneNumber timezone')
        .populate('resumeId')

    if (!application) {
        throw new CustomError('Application not found', 404)
    }

    const seekerIdStr = application.seekerId && typeof application.seekerId === 'object' && '_id' in application.seekerId
        ? (application.seekerId as any)._id.toString()
        : `${application.seekerId}`

    const resumeIdStr = application.resumeId && typeof application.resumeId === 'object' && '_id' in application.resumeId
        ? (application.resumeId as any)._id.toString()
        : application.resumeId ? `${application.resumeId}` : null

    // Parallel fetch of all linked AI screening & assessment assets
    const [seekerProfile, cvAnalysis, jobMatchScore, testInvite, interviewInvite] = await Promise.all([
        seekerProfileModel.findOne({ userId: seekerIdStr }),
        resumeIdStr ? cvAnalysisModel.findOne({ resumeId: resumeIdStr }) : null,
        jobMatchScoreModel.findOne({ applicationId }),
        testInviteModel.findOne({ applicationId }),
        interviewInviteModel.findOne({ applicationId })
    ])

    const cvAnalysisObj = cvAnalysis ? (cvAnalysis.toObject ? cvAnalysis.toObject() : { ...cvAnalysis }) : null
    if (cvAnalysisObj && cvAnalysisObj.rawProviderResponse) {
        delete cvAnalysisObj.rawProviderResponse
    }

    return {
        application: typeof (application as any).toObject === 'function' ? (application as any).toObject() : application,
        seekerProfile: seekerProfile ? (seekerProfile.toObject ? seekerProfile.toObject() : seekerProfile) : null,
        cvAnalysis: cvAnalysisObj,
        jobMatchScore: jobMatchScore ? (jobMatchScore.toObject ? jobMatchScore.toObject() : jobMatchScore) : null,
        testInvite: testInvite ? (testInvite.toObject ? testInvite.toObject() : testInvite) : null,
        interviewInvite: interviewInvite ? (interviewInvite.toObject ? interviewInvite.toObject() : interviewInvite) : null
    }
}
