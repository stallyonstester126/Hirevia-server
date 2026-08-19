export interface StructuredAnalysis {
    extractedSkills: string[]
    experienceSummary: string
    educationSummary: string
    estimatedExperienceLevel: string
    suggestions: string[]
    unavailable?: boolean
}

export interface JobMatchResult {
    score: number
    rationale: string
    unavailable?: boolean
}

export interface AssessmentGradingResult {
    score: number
    feedback: string
    unavailable?: boolean
}

export interface InterviewGradingResult {
    score: number
    feedback: string
    unavailable?: boolean
}

export interface ICVAnalysisProvider {
    analyze(resumeText: string): Promise<StructuredAnalysis>
    matchJob(resumeText: string, jobDetails: string): Promise<JobMatchResult>
    gradeAssessment(
        jobDetails: string,
        responses: Array<{ question: string; answer: string }>
    ): Promise<AssessmentGradingResult>
    gradeInterviewTranscript(
        jobDetails: string,
        transcript: string
    ): Promise<InterviewGradingResult>
}
export default ICVAnalysisProvider
