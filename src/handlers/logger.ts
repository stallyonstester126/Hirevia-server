import { createLogger, format, transports } from 'winston'
import util from 'util'
import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports'
import config from '../config/config'
import { EApplicationEnvironment } from '../constant/application'
import path from 'path'

import * as sourceMapSupport from 'source-map-support'
import { blue, green, magenta, red, yellow } from 'colorette'

import 'winston-mongodb'
import { MongoDBTransportInstance } from 'winston-mongodb'

//linking source map
sourceMapSupport.install()

const colorize = (level: string) => {
    switch (level) {
        case 'ERROR':
            return red(level)
        case 'INFO':
            return blue(level)
        case 'WARN':
            return yellow(level)
        default:
            return level
    }
}

const logFormat = format.printf((info) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { level, message, timestamp, meta = {} } = info

    const customLevel = colorize(level.toUpperCase())

    const customTimestamp = green(timestamp as string)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const customMessage = message
    const customMeta = util.inspect(meta, {
        showHidden: false,
        depth: null,
        colors: true
    })

    const customLog = `${customLevel} [${customTimestamp}] ${customMessage}\n${magenta('Meta')} ${customMeta}\n`

    return customLog
})

const fileFormat = format.printf((info) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { level, message, timestamp, meta = {} } = info

    const logMeta: Record<string, unknown> = {}

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const [key, value] of Object.entries(meta)) {
        if (value instanceof Error) {
            logMeta[key] = {
                name: value.name,
                message: value.message,
                trace: value.stack || ''
            }
        } else {
            logMeta[key] = value
        }
    }

    const logData = {
        level: level.toUpperCase(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        timestamp,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message,
        meta: logMeta
    }

    return JSON.stringify(logData, null, 4)
})

const getCleanMeta = (meta: unknown): Record<string, unknown> => {
    if (!meta || typeof meta !== 'object') return {}
    try {
        const cache = new WeakSet()
        const jsonString = JSON.stringify(meta, (_key, value) => {
            if (typeof value === 'object' && value !== null) {
                if ('_doc' in value && typeof (value as any).toObject === 'function') {
                    value = (value as any).toObject()
                }
                if (cache.has(value)) {
                    return '[Circular]'
                }
                cache.add(value)
            }
            if (typeof value === 'string' && value.length > 5000) {
                return value.slice(0, 5000) + '... [truncated]'
            }
            if (Buffer.isBuffer(value)) {
                return `[Buffer (${value.length} bytes)]`
            }
            return value
        })
        return JSON.parse(jsonString) as Record<string, unknown>
    } catch {
        return { note: '[Meta Sanitization Failed]' }
    }
}

const sanitizeMetaFormat = format((info) => {
    if (info.meta) {
        info.meta = getCleanMeta(info.meta)
    }
    return info
})

const consoleTransport = (): Array<ConsoleTransportInstance> => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return [
            new transports.Console({
                level: 'info',
                format: format.combine(sanitizeMetaFormat(), format.timestamp(), logFormat)
            })
        ]
    }
    return []
}

const fileTransport = (): Array<FileTransportInstance> => {
    return [
        new transports.File({
            filename: path.join(__dirname, '../', '../', 'logs', `${config.ENV}.log`),
            level: 'info',
            format: format.combine(sanitizeMetaFormat(), format.timestamp(), fileFormat)
        })
    ]
}

const dbTransport = (): Array<MongoDBTransportInstance> => {
    if (process.env.NODE_ENV === 'test' || !config.DATABASE_URL) {
        return []
    }
    const mongoTransport = new transports.MongoDB({
        level: 'info',
        db: config.DATABASE_URL,
        metaKey: 'meta',
        expireAfterSeconds: 3600 * 24 * 30,
        collection: 'logs',
        tryReconnect: true,
        options: {
            useUnifiedTopology: true
        }
    })
    mongoTransport.on('error', (err) => {
        console.error('[Winston MongoDB Transport Error]:', err.message)
    })
    return [mongoTransport]
}

export default createLogger({
    defaultMeta: {
        meta: {}
    },
    format: format.combine(sanitizeMetaFormat(), format.timestamp()),
    transports: [...fileTransport(), ...dbTransport(), ...consoleTransport()]
})

