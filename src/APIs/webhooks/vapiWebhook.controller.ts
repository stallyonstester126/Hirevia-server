import { NextFunction, Request, Response } from 'express'
import httpResponse from '../../handlers/httpResponse'
import responseMessage from '../../constant/responseMessage'
import httpError from '../../handlers/errorHandler/httpError'
import { CustomError } from '../../utils/errors'
import * as interviewInviteService from '../interviewInvite/_shared/services/interviewInvite.service'
import config from '../../config/config'
import logger from '../../handlers/logger'
import asyncHandler from '../../handlers/async'

export default {
    receive: asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
        try {
            // Webhook Secret Verification
            const vapiSecret = request.headers['x-vapi-secret']
            if (config.VAPI_WEBHOOK_SECRET && config.VAPI_WEBHOOK_SECRET.trim().length > 0) {
                if (vapiSecret !== config.VAPI_WEBHOOK_SECRET) {
                    logger.warn('[VapiWebhook] Unauthorized webhook request: invalid x-vapi-secret header')
                    return httpError(next, new CustomError('Unauthorized: Invalid Vapi webhook secret', 401), request, 401)
                }
            }

            const message = request.body?.message || request.body || {}
            const messageType = message.type

            logger.info(`[VapiWebhook] Received Vapi webhook event: ${messageType}`)

            if (messageType !== 'end-of-call-report') {
                return httpResponse(response, request, 200, responseMessage.SUCCESS, {
                    ignored: true,
                    messageType
                })
            }

            // Extract transcript
            let transcript = message.transcript || message.artifact?.transcript || ''
            if (!transcript && Array.isArray(message.artifact?.messages)) {
                transcript = message.artifact.messages
                    .map((m: any) => `${m.role === 'assistant' ? 'AI Interviewer' : 'Candidate'}: ${m.message || m.content || ''}`)
                    .join('\n')
            }

            const call = message.call || {}
            const vapiCallId = call.id || message.callId
            const metadata = call.metadata || message.metadata || call.assistantOverrides?.metadata || {}

            const token = metadata.token
            const applicationId = metadata.applicationId

            const endedReason = message.endedReason || call.endedReason || message.call?.endedReason || 'ASSISTANT_ENDED'

            logger.info(`[VapiWebhook] Processing end-of-call-report: token=${token}, applicationId=${applicationId}, vapiCallId=${vapiCallId}, endedReason=${endedReason}`)

            const result = await interviewInviteService.completeInterviewByWebhook(
                { token, applicationId, vapiCallId },
                transcript,
                vapiCallId,
                endedReason
            )

            httpResponse(response, request, 200, responseMessage.SUCCESS, result)
        } catch (error) {
            if (error instanceof CustomError) {
                httpError(next, error, request, error.statusCode)
            } else {
                httpError(next, error, request, 500)
            }
        }
    })
}
