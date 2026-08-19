import app from '../app'
import { bootstrap } from '../bootstrap'
import config from '../config/config'
import logger from '../handlers/logger'

const PORT = Number(config.PORT) || 3000

const server = app.listen(PORT)

void (async () => {
    try {
        await bootstrap()
        logger.info(`Application started on port ${PORT}`, {
            meta: { SERVER_URL: config.SERVER_URL }
        })
    } catch (error) {
        logger.error(`Error starting server:`, { meta: error })
        server.close((err) => {
            if (err) logger.error(`Error closing server:`, { meta: err })
            process.exit(1)
        })
    }
})()
