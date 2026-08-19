import config from '../../config/config'
import { ICVAnalysisProvider, StructuredAnalysis, JobMatchResult, AssessmentGradingResult, InterviewGradingResult } from './ai.interface'
import joi from 'joi'

const analysisSchema = joi.object({
    extractedSkills: joi.array().items(joi.string()).required(),
    experienceSummary: joi.string().required(),
    educationSummary: joi.string().required(),
    estimatedExperienceLevel: joi.string().valid('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD').required(),
    suggestions: joi.array().items(joi.string()).required()
})

const matchSchema = joi.object({
    score: joi.number().min(0).max(100).required(),
    rationale: joi.string().required()
})

const assessmentGradingSchema = joi.object({
    score: joi.number().min(0).max(100).required(),
    feedback: joi.string().required()
})

interface IGroqResponse {
    choices?: {
        message: {
            content: string
        }
    }[]
    unavailable?: boolean
}

class GroqProvider implements ICVAnalysisProvider {
    private apiKey: string
    private model: string

    constructor() {
        this.apiKey = config.GROQ_API_KEY || ''
        this.model = config.GROQ_MODEL || 'llama-3.3-70b-versatile'
    }

    private isConfigured(): boolean {
        return !!this.apiKey && !this.apiKey.startsWith('gsk_placeholder')
    }

    private async callGroqWithRetry(
        messages: { role: string; content: string }[],
        responseFormat?: { type: string },
        retriesLeft = 1
    ): Promise<IGroqResponse> {
        if (!this.isConfigured()) {
            return { unavailable: true }
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    response_format: responseFormat || { type: 'json_object' }
                }),
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorBody = await response.text()
                console.error(`[GroqProvider] Groq API returned ${response.status}:`, errorBody)
                throw new Error(`Groq API returned status code ${response.status}: ${errorBody}`)
            }

            const data = (await response.json()) as IGroqResponse
            return data
        } catch (err) {
            clearTimeout(timeoutId)
            console.error('[GroqProvider] fetch error:', err)
            if (retriesLeft > 0) {
                // Retry once
                return this.callGroqWithRetry(messages, responseFormat, retriesLeft - 1)
            }
            // If all retries failed, return unavailable rather than crashing
            return { unavailable: true }
        }
    }

    async analyze(resumeText: string): Promise<StructuredAnalysis> {
        const systemPrompt = `You are a professional HR assistant and resume parser. Parse the following resume text into a structured JSON object. 
The JSON object must have exactly the following structure:
{
  "extractedSkills": ["skill1", "skill2"],
  "experienceSummary": "brief summary of candidate's professional experience",
  "educationSummary": "brief summary of candidate's educational background",
  "estimatedExperienceLevel": "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD",
  "suggestions": ["suggestion1", "suggestion2"]
}
Only estimatedExperienceLevel values allowed: "ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD".
Return ONLY the raw JSON object. Do not wrap it in markdown codeblocks.`

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: resumeText }
        ]

        const response = await this.callGroqWithRetry(messages)
        if (response.unavailable) {
            return { unavailable: true } as unknown as StructuredAnalysis
        }

        try {
            const rawText = response.choices?.[0]?.message?.content || ''
            const parsed = JSON.parse(rawText) as unknown

            const validationResult = analysisSchema.validate(parsed, { stripUnknown: true })
            if (validationResult.error) {
                throw new Error(`JSON does not match schema validation: ${validationResult.error.message}`)
            }

            return validationResult.value as StructuredAnalysis
        } catch {
            return { unavailable: true } as unknown as StructuredAnalysis
        }
    }

    async matchJob(resumeText: string, jobDetails: string): Promise<JobMatchResult> {
        const matchSystemPrompt = `You are a professional HR recruiter. Match the following resume text against the job details.
The JSON object must have exactly the following structure:
{
  "score": number (0 to 100 representing percentage match fit),
  "rationale": "a short summary explaining the score alignment and gaps"
}
Return ONLY the raw JSON object. Do not wrap it in markdown codeblocks.`

        const messages = [
            { role: 'system', content: matchSystemPrompt },
            { role: 'user', content: `Resume text:\n${resumeText}\n\nJob details:\n${jobDetails}` }
        ]

        const response = await this.callGroqWithRetry(messages)
        if (response.unavailable) {
            return { unavailable: true } as unknown as JobMatchResult
        }

        try {
            const rawText = response.choices?.[0]?.message?.content || ''
            const parsed = JSON.parse(rawText) as unknown

            const validationResult = matchSchema.validate(parsed, { stripUnknown: true })
            if (validationResult.error) {
                throw new Error(`JSON does not match schema validation: ${validationResult.error.message}`)
            }

            return validationResult.value as JobMatchResult
        } catch {
            return { unavailable: true } as unknown as JobMatchResult
        }
    }

    async gradeAssessment(
        jobDetails: string,
        responses: Array<{ question: string; answer: string }>
    ): Promise<AssessmentGradingResult> {
        const gradingSystemPrompt = `You are a senior technical hiring manager evaluating candidate answers to an assessment for a job role.
Grade the candidate's answers based on depth, clarity, relevance, and problem-solving capability relative to the job requirements.
The JSON object must have exactly the following structure:
{
  "score": number (0 to 100 representing overall quality),
  "feedback": "a concise evaluation rationale highlighting strengths and gaps"
}
Return ONLY the raw JSON object. Do not wrap it in markdown codeblocks.`

        const formattedResponses = responses
            .map((r, i) => `Question ${i + 1}: ${r.question}\nAnswer: ${r.answer}`)
            .join('\n\n')

        const messages = [
            { role: 'system', content: gradingSystemPrompt },
            {
                role: 'user',
                content: `Job Details:\n${jobDetails}\n\nCandidate Responses:\n${formattedResponses}`
            }
        ]

        const response = await this.callGroqWithRetry(messages)
        if (response.unavailable) {
            return { unavailable: true } as unknown as AssessmentGradingResult
        }

        try {
            const rawText = response.choices?.[0]?.message?.content || ''
            const parsed = JSON.parse(rawText) as unknown

            const validationResult = assessmentGradingSchema.validate(parsed, { stripUnknown: true })
            if (validationResult.error) {
                throw new Error(`JSON does not match schema validation: ${validationResult.error.message}`)
            }

            return validationResult.value as AssessmentGradingResult
        } catch {
            return { unavailable: true } as unknown as AssessmentGradingResult
        }
    }

    async gradeInterviewTranscript(
        jobDetails: string,
        transcript: string
    ): Promise<InterviewGradingResult> {
        const interviewSystemPrompt = `You are an expert executive technical recruiter evaluating a candidate's voice interview transcript for an open job position.
Evaluate the candidate's communication skills, depth of domain knowledge, problem-solving reasoning, and culture fit based on the conversation transcript.
The JSON object must have exactly the following structure:
{
  "score": number (0 to 100 representing overall interview performance),
  "feedback": "a concise evaluation rationale summarizing strengths, communication clarity, and potential concerns or gaps"
}
Return ONLY the raw JSON object. Do not wrap it in markdown codeblocks.`

        const messages = [
            { role: 'system', content: interviewSystemPrompt },
            {
                role: 'user',
                content: `Job Details:\n${jobDetails}\n\nInterview Conversation Transcript:\n${transcript}`
            }
        ]

        const response = await this.callGroqWithRetry(messages)
        if (response.unavailable) {
            return { unavailable: true } as unknown as InterviewGradingResult
        }

        try {
            const rawText = response.choices?.[0]?.message?.content || ''
            const parsed = JSON.parse(rawText) as unknown

            const validationResult = assessmentGradingSchema.validate(parsed, { stripUnknown: true })
            if (validationResult.error) {
                throw new Error(`JSON does not match schema validation: ${validationResult.error.message}`)
            }

            return validationResult.value as InterviewGradingResult
        } catch {
            return { unavailable: true } as unknown as InterviewGradingResult
        }
    }
}

export const CVAnalysisProvider: ICVAnalysisProvider = new GroqProvider()
export default CVAnalysisProvider

