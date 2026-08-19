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

//Middlewares
app.use(helmet())
app.use(cookieParser())
app.use(
    cors({
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
        origin: [config.CLIENT_URL as string, config.ADMIN_URL as string]
            .filter(Boolean)
            .flatMap((url) => url.split(',').map((u) => u.trim())),
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

//Router
// app.use('/v1', router)
router(app)

//404 handler
app.use(notFound)

//Handlers as Middlewares
app.use(errorHandler)

export default app
