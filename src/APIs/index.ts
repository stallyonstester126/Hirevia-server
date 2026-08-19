import { Application } from 'express'
import { API_ROOT } from '../constant/application'

import General from './router'
import authRoutes from './user/authentication'
import userManagementRoutes from './user/management'
import companyProfileRoutes from './company/profile'
import seekerProfileRoutes from './seeker/profile'
import companyJobsRoutes from './company/jobs'
import publicJobsRoutes from './job/marketplace'
import seekerApplicationsRoutes from './seeker/applications'
import companyApplicationsRoutes from './company/applications'

import seekerResumesRoutes from './seeker/resumes'
import webhooksRoutes from './webhooks'
import publicTestRoutes from './testInvite/public'
import publicInterviewRoutes from './interviewInvite/public'
import adminRoutes from './admin'

const App = (app: Application) => {
    app.use(`${API_ROOT}`, General)
    app.use(`${API_ROOT}`, authRoutes)
    app.use(`${API_ROOT}/user`, userManagementRoutes)
    app.use(`${API_ROOT}/company`, companyProfileRoutes)
    app.use(`${API_ROOT}/seeker`, seekerProfileRoutes)
    app.use(`${API_ROOT}/company/jobs`, companyJobsRoutes)
    app.use(`${API_ROOT}/jobs`, publicJobsRoutes)
    app.use(`${API_ROOT}/seeker/applications`, seekerApplicationsRoutes)
    app.use(`${API_ROOT}/company/applications`, companyApplicationsRoutes)
    app.use(`${API_ROOT}/seeker/resumes`, seekerResumesRoutes)
    app.use(`${API_ROOT}/webhooks`, webhooksRoutes)
    app.use(`${API_ROOT}/test`, publicTestRoutes)
    app.use(`${API_ROOT}/interview`, publicInterviewRoutes)
    app.use(`${API_ROOT}/admin`, adminRoutes)
}

export default App

