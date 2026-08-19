import resumeRepository from '../repo/resume.repository'
import cvAnalysisRepository from '../repo/cvAnalysis.repository'
import StorageService from '../../../../services/storage'
import extractText from '../../../../utils/textExtractor'
import CVAnalysisProvider from '../../../../services/ai/groq.provider'
import { CustomError } from '../../../../utils/errors'
import { ICVAnalysis } from '../types/cvAnalysis.interface'

export const analyzeResume = async (seekerId: string, resumeId: string, force = false) => {
    const resume = await resumeRepository.findById(resumeId)
    if (!resume || resume.seekerId.toString() !== seekerId.toString()) {
        throw new CustomError('Resume not found', 404)
    }

    let analysis = await cvAnalysisRepository.findByResumeId(resumeId)
    if (analysis && analysis.status === 'COMPLETE' && !force) {
        return analysis
    }

    // Initialize or reset parsing record
    const initialPayload: ICVAnalysis = {
        resumeId,
        seekerId,
        extractedSkills: [],
        experienceSummary: 'Extracting...',
        educationSummary: 'Extracting...',
        estimatedExperienceLevel: 'ENTRY',
        suggestions: [],
        status: 'PENDING'
    }

    if (!analysis) {
        analysis = await cvAnalysisRepository.create(initialPayload) as any
    } else {
        await cvAnalysisRepository.update(resumeId, { status: 'PENDING' })
    }

    try {
        const fileBuffer = await StorageService.get(resume.storageKey, 'resumes')
        const rawText = await extractText(fileBuffer, resume.fileExtension)

        const parsed = await CVAnalysisProvider.analyze(rawText)
        if (parsed.unavailable) {
            await cvAnalysisRepository.update(resumeId, { status: 'FAILED' })
            throw new CustomError('AI analysis service is currently unavailable', 503)
        }

        const updatePayload: Partial<ICVAnalysis> = {
            extractedSkills: parsed.extractedSkills,
            experienceSummary: parsed.experienceSummary,
            educationSummary: parsed.educationSummary,
            estimatedExperienceLevel: parsed.estimatedExperienceLevel,
            suggestions: parsed.suggestions,
            status: 'COMPLETE',
            rawProviderResponse: parsed
        }

        const updatedAnalysis = await cvAnalysisRepository.update(resumeId, updatePayload)
        return updatedAnalysis
    } catch (error: any) {
        await cvAnalysisRepository.update(resumeId, { status: 'FAILED' })
        if (error instanceof CustomError) {
            throw error
        }
        throw new CustomError(`CV Analysis execution failed: ${error.message}`, 500)
    }
}

export const getResumeAnalysis = async (seekerId: string, resumeId: string) => {
    const resume = await resumeRepository.findById(resumeId)
    if (!resume || resume.seekerId.toString() !== seekerId.toString()) {
        throw new CustomError('Resume not found', 404)
    }

    const analysis = await cvAnalysisRepository.findByResumeId(resumeId)
    if (!analysis) {
        throw new CustomError('Analysis not found for this resume version', 404)
    }

    return analysis
}
