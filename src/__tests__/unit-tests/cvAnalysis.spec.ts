import { analyzeResume, getResumeAnalysis } from '../../APIs/seeker/_shared/services/cvAnalysis.service'
import { getCompanyApplicationAnalysis, matchCompanyApplicationJob } from '../../APIs/application/_shared/services/application.service'
import resumeRepository from '../../APIs/seeker/_shared/repo/resume.repository'
import cvAnalysisRepository from '../../APIs/seeker/_shared/repo/cvAnalysis.repository'
import jobMatchScoreRepository from '../../APIs/application/_shared/repo/jobMatchScore.repository'
import StorageService from '../../services/storage'
import CVAnalysisProvider from '../../services/ai/groq.provider'
import applicationRepository from '../../APIs/application/_shared/repo/application.repository'
import jobRepository from '../../APIs/job/_shared/repo/job.repository'
import { CustomError } from '../../utils/errors'
import extractText from '../../utils/textExtractor'

jest.mock('../../APIs/seeker/_shared/repo/resume.repository')
jest.mock('../../APIs/seeker/_shared/repo/cvAnalysis.repository')
jest.mock('../../APIs/application/_shared/repo/jobMatchScore.repository')
jest.mock('../../services/storage')
jest.mock('../../services/ai/groq.provider')
jest.mock('../../APIs/application/_shared/repo/application.repository')
jest.mock('../../APIs/job/_shared/repo/job.repository')
jest.mock('../../utils/textExtractor')

describe('CV Analysis & Job Match Service', () => {
    const mockSeekerId = 'seeker123'
    const mockResumeId = 'resume123'
    const mockCompanyId = 'company123'
    const mockAppId = 'app123'
    const mockJobId = 'job123'

    const mockResume = {
        _id: mockResumeId,
        seekerId: mockSeekerId,
        storageKey: 'key.pdf',
        fileExtension: '.pdf'
    }

    const mockJob = {
        _id: mockJobId,
        companyId: mockCompanyId,
        title: 'Developer',
        description: 'Node.js details',
        requirements: ['Node']
    }

    const mockApplication = {
        _id: mockAppId,
        jobId: mockJobId,
        seekerId: mockSeekerId,
        resumeId: mockResumeId
    }

    const mockAnalysisResult = {
        extractedSkills: ['TypeScript', 'Node'],
        experienceSummary: 'Experienced dev.',
        educationSummary: 'CS degree.',
        estimatedExperienceLevel: 'MID',
        suggestions: ['Add React']
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Seeker CV Analysis', () => {
        it('should perform analysis successfully and save it to the repository', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(cvAnalysisRepository.findByResumeId as jest.Mock).mockResolvedValue(null)
            ;(StorageService.get as jest.Mock).mockResolvedValue(Buffer.from('PDF_CONTENT'))
            ;(extractText as jest.Mock).mockResolvedValue('Resume text content')
            ;(CVAnalysisProvider.analyze as jest.Mock).mockResolvedValue(mockAnalysisResult)
            ;(cvAnalysisRepository.create as jest.Mock).mockResolvedValue({
                _id: 'analysis123'
            })
            ;(cvAnalysisRepository.update as jest.Mock).mockResolvedValue({
                ...mockAnalysisResult,
                status: 'COMPLETE'
            })

            const result = await analyzeResume(mockSeekerId, mockResumeId)
            expect(result.status).toBe('COMPLETE')
            expect(cvAnalysisRepository.create).toHaveBeenCalled()
            expect(CVAnalysisProvider.analyze).toHaveBeenCalledWith('Resume text content')
        })

        it('should return cached analysis if it is already COMPLETE', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(cvAnalysisRepository.findByResumeId as jest.Mock).mockResolvedValue({
                status: 'COMPLETE',
                extractedSkills: ['TypeScript']
            })

            const result = await analyzeResume(mockSeekerId, mockResumeId)
            expect(result.extractedSkills).toEqual(['TypeScript'])
            expect(CVAnalysisProvider.analyze).not.toHaveBeenCalled()
        })

        it('should call Groq provider if force=true even if cached analysis is COMPLETE', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(cvAnalysisRepository.findByResumeId as jest.Mock).mockResolvedValue({
                status: 'COMPLETE',
                extractedSkills: ['TypeScript']
            })
            ;(StorageService.get as jest.Mock).mockResolvedValue(Buffer.from('PDF'))
            ;(extractText as jest.Mock).mockResolvedValue('text')
            ;(CVAnalysisProvider.analyze as jest.Mock).mockResolvedValue(mockAnalysisResult)

            await analyzeResume(mockSeekerId, mockResumeId, true)
            expect(CVAnalysisProvider.analyze).toHaveBeenCalled()
        })

        it('should throw 503 CustomError and save status FAILED when AI provider is unavailable', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(cvAnalysisRepository.findByResumeId as jest.Mock).mockResolvedValue(null)
            ;(StorageService.get as jest.Mock).mockResolvedValue(Buffer.from('PDF'))
            ;(extractText as jest.Mock).mockResolvedValue('text')
            ;(CVAnalysisProvider.analyze as jest.Mock).mockResolvedValue({ unavailable: true })

            await expect(analyzeResume(mockSeekerId, mockResumeId)).rejects.toThrow(
                new CustomError('AI analysis service is currently unavailable', 503)
            )
            expect(cvAnalysisRepository.update).toHaveBeenCalledWith(mockResumeId, { status: 'FAILED' })
        })

        it('should throw 404 CustomError if resume does not belong to seeker', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue({
                ...mockResume,
                seekerId: 'anotherSeeker'
            })

            await expect(analyzeResume(mockSeekerId, mockResumeId)).rejects.toThrow(
                new CustomError('Resume not found', 404)
            )
        })
    })

    describe('getResumeAnalysis', () => {
        it('should retrieve analysis for own resume successfully', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(cvAnalysisRepository.findByResumeId as jest.Mock).mockResolvedValue(mockAnalysisResult)

            const result = await getResumeAnalysis(mockSeekerId, mockResumeId)
            expect(result).toEqual(mockAnalysisResult)
        })

        it('should throw 404 CustomError if analysis does not exist', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(cvAnalysisRepository.findByResumeId as jest.Mock).mockResolvedValue(null)

            await expect(getResumeAnalysis(mockSeekerId, mockResumeId)).rejects.toThrow(
                new CustomError('Analysis not found for this resume version', 404)
            )
        })
    })

    describe('Company Applications Match', () => {
        it('should return analysis and match score, and strip rawProviderResponse', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            
            const mockDbAnalysis = {
                toObject: () => ({
                    extractedSkills: ['TypeScript'],
                    rawProviderResponse: { debug: 'details' }
                })
            }
            ;(cvAnalysisRepository.findByResumeId as jest.Mock).mockResolvedValue(mockDbAnalysis)
            ;(jobMatchScoreRepository.findByApplicationId as jest.Mock).mockResolvedValue({
                score: 85,
                rationale: 'Good match'
            })

            const result = await getCompanyApplicationAnalysis(mockCompanyId, mockAppId)
            expect(result.analysis?.rawProviderResponse).toBeUndefined()
            expect(result.analysis?.extractedSkills).toEqual(['TypeScript'])
            expect(result.matchScore?.score).toBe(85)
        })

        it('should throw 404 CustomError if job does not belong to company', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue({
                ...mockJob,
                companyId: 'anotherCompany'
            })

            await expect(getCompanyApplicationAnalysis(mockCompanyId, mockAppId)).rejects.toThrow(
                new CustomError('Application not found', 404)
            )
        })

        it('should calculate match score and save it successfully', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(StorageService.get as jest.Mock).mockResolvedValue(Buffer.from('PDF'))
            ;(extractText as jest.Mock).mockResolvedValue('Resume text')
            
            const mockMatchResult = { score: 92, rationale: 'Highly qualified.' }
            ;(CVAnalysisProvider.matchJob as jest.Mock).mockResolvedValue(mockMatchResult)
            ;(jobMatchScoreRepository.update as jest.Mock).mockResolvedValue(mockMatchResult)

            const result = await matchCompanyApplicationJob(mockCompanyId, mockAppId)
            expect(result.score).toBe(92)
            expect(jobMatchScoreRepository.update).toHaveBeenCalledWith(
                mockAppId,
                expect.objectContaining({
                    score: 92,
                    rationale: 'Highly qualified.'
                })
            )
        })

        it('should throw 503 CustomError when matching AI service is unavailable', async () => {
            ;(applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication)
            ;(jobRepository.findById as jest.Mock).mockResolvedValue(mockJob)
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(StorageService.get as jest.Mock).mockResolvedValue(Buffer.from('PDF'))
            ;(extractText as jest.Mock).mockResolvedValue('Resume text')
            ;(CVAnalysisProvider.matchJob as jest.Mock).mockResolvedValue({ unavailable: true })

            await expect(matchCompanyApplicationJob(mockCompanyId, mockAppId)).rejects.toThrow(
                new CustomError('AI matching service is currently unavailable', 503)
            )
        })
    })
})
