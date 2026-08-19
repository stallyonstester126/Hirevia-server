import { Request, Response } from 'express'
import { THttpResponse } from '../types/types'
import config from '../config/config'
import { EApplicationEnvironment } from '../constant/application'
import logger from './logger'

export default (res: Response, req: Request, responseStatusCode: number, responseMessage: string, data: unknown): void => {
    let safeData = data
    if (data && typeof data === 'object' && 'toObject' in data && typeof (data as any).toObject === 'function') {
        safeData = (data as any).toObject()
    }

    const response: THttpResponse = {
        success: true,
        statusCode: responseStatusCode,
        request: {
            ip: req.ip || null,
            method: req.method,
            url: req.originalUrl
        },
        message: responseMessage,
        data: safeData
    }

    logger.info(`Controller Response`, {
        meta: {
            success: response.success,
            statusCode: response.statusCode,
            request: response.request,
            message: response.message
        }
    })

    // To check if the ENV is production
    if (config.ENV === EApplicationEnvironment.PRODUCTION) {
        delete response.request.ip
    }

    res.status(responseStatusCode).json(response)
}

