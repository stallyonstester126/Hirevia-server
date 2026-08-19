import userModel from '../../user/_shared/models/user.model'
import jobModel from '../../job/_shared/models/job.model'
import applicationModel from '../../application/_shared/models/application.model'
import paymentModel from '../../company/_shared/models/payment.model'
import cvAnalysisModel from '../../seeker/_shared/models/cvAnalysis.model'
import testInviteModel from '../../testInvite/_shared/models/testInvite.model'
import interviewInviteModel from '../../interviewInvite/_shared/models/interviewInvite.model'
import resumeModel from '../../seeker/_shared/models/resume.model'

export const getPlatformStats = async () => {
    const [
        usersByRole,
        totalUsers,
        suspendedUsersCount,
        jobsByStatus,
        totalJobs,
        applicationsByStatus,
        applicationsByAutoScreeningStatus,
        applicationsByAdvancedBy,
        totalApplications,
        paymentsByStatus,
        totalPayments,
        cvAnalysisByStatus,
        totalCVAnalyses,
        testInvitesByStatus,
        testInviteScoreAgg,
        totalTestInvites,
        interviewInvitesByStatus,
        interviewInviteScoreAgg,
        totalInterviewInvites,
        totalResumes
    ] = await Promise.all([
        // 1. Users by role
        userModel.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        userModel.countDocuments(),
        userModel.countDocuments({ isSuspended: true }),

        // 2. Jobs by status
        jobModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        jobModel.countDocuments(),

        // 3. Applications by status, autoScreeningStatus, advancedBy
        applicationModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        applicationModel.aggregate([
            { $group: { _id: '$autoScreeningStatus', count: { $sum: 1 } } }
        ]),
        applicationModel.aggregate([
            { $group: { _id: '$advancedBy', count: { $sum: 1 } } }
        ]),
        applicationModel.countDocuments(),

        // 4. Payments
        paymentModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    sumAmount: { $sum: '$amount' }
                }
            }
        ]),
        paymentModel.countDocuments(),

        // 5. CVAnalysis
        cvAnalysisModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        cvAnalysisModel.countDocuments(),

        // 6. TestInvites & Average Assessment Score
        testInviteModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        testInviteModel.aggregate([
            { $match: { assessmentScore: { $ne: null } } },
            { $group: { _id: null, avgScore: { $avg: '$assessmentScore' } } }
        ]),
        testInviteModel.countDocuments(),

        // 7. InterviewInvites & Average Interview Score
        interviewInviteModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        interviewInviteModel.aggregate([
            { $match: { interviewScore: { $ne: null } } },
            { $group: { _id: null, avgScore: { $avg: '$interviewScore' } } }
        ]),
        interviewInviteModel.countDocuments(),

        // 8. Resumes
        resumeModel.countDocuments()
    ])

    const totalRevenueCents = paymentsByStatus
        .filter((p: any) => p._id === 'SUCCEEDED')
        .reduce((acc: number, curr: any) => acc + (curr.sumAmount || 0), 0)

    const avgAssessmentScore = testInviteScoreAgg.length > 0 && typeof testInviteScoreAgg[0].avgScore === 'number'
        ? Math.round(testInviteScoreAgg[0].avgScore * 100) / 100
        : null

    const avgInterviewScore = interviewInviteScoreAgg.length > 0 && typeof interviewInviteScoreAgg[0].avgScore === 'number'
        ? Math.round(interviewInviteScoreAgg[0].avgScore * 100) / 100
        : null

    return {
        users: {
            total: totalUsers,
            suspendedCount: suspendedUsersCount,
            byRole: usersByRole.map((u: any) => ({ role: u._id, count: u.count }))
        },
        jobs: {
            total: totalJobs,
            byStatus: jobsByStatus.map((j: any) => ({ status: j._id, count: j.count }))
        },
        applications: {
            total: totalApplications,
            byStatus: applicationsByStatus.map((a: any) => ({ status: a._id, count: a.count })),
            byAutoScreeningStatus: applicationsByAutoScreeningStatus.map((s: any) => ({
                status: s._id || 'PENDING',
                count: s.count
            })),
            byAdvancedBy: applicationsByAdvancedBy.map((adv: any) => ({
                advancedBy: adv._id === null ? 'UNASSIGNED' : adv._id,
                count: adv.count
            }))
        },
        payments: {
            total: totalPayments,
            totalRevenueCents,
            totalRevenueFormatted: `$${(totalRevenueCents / 100).toFixed(2)}`,
            byStatus: paymentsByStatus.map((p: any) => ({
                status: p._id,
                count: p.count,
                sumAmount: p.sumAmount
            }))
        },
        cvAnalysis: {
            total: totalCVAnalyses,
            byStatus: cvAnalysisByStatus.map((c: any) => ({ status: c._id, count: c.count }))
        },
        testInvites: {
            total: totalTestInvites,
            averageAssessmentScore: avgAssessmentScore,
            byStatus: testInvitesByStatus.map((t: any) => ({ status: t._id, count: t.count }))
        },
        interviewInvites: {
            total: totalInterviewInvites,
            averageInterviewScore: avgInterviewScore,
            byStatus: interviewInvitesByStatus.map((i: any) => ({ status: i._id, count: i.count }))
        },
        resumes: {
            total: totalResumes
        }
    }
}
