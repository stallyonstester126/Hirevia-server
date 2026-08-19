import express, { Application } from 'express'
import path from 'path'
import router from './APIs'
import errorHandler from './middlewares/errorHandler'
import notFound from './handlers/notFound'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import config from './config/config'
import { IncomingMessage } from 'http'

const app: Application = express()

// Allowed origins for CORS (supports comma-separated origins from env)
const allowedOrigins = (config.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

// Middlewares
app.use(helmet())
app.use(cookieParser())
app.use(
    cors({
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. server-to-server, curl, Postman, mobile apps)
            if (!origin) return callback(null, true)

            // If origin is in allowed origins list, allow it by reflecting the specific origin back
            if (allowedOrigins.includes(origin)) {
                return callback(null, origin)
            }

            // In development, also allow localhost origins if not explicitly listed
            if (config.ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
                return callback(null, origin)
            }

            return callback(new Error(`Origin ${origin} not allowed by CORS`))
        },
        credentials: true
    })
)

app.use(
    express.json({
        verify: (req: IncomingMessage & { originalUrl?: string; rawBody?: Buffer }, _res, buf) => {
            if (req.originalUrl && req.originalUrl.includes('/webhooks/stripe')) {
                req.rawBody = buf
            }
        }
    })
)

app.use(express.static(path.join(__dirname, '../', 'public')))

// Router
router(app)

// 404 handler
app.use(notFound)

// Handlers as Middlewares
app.use(errorHandler)

export default app
