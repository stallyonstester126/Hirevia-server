import dotenvFlow from 'dotenv-flow'

dotenvFlow.config()

export default {
    // General
    ENV: process.env.ENV,
    PORT: process.env.PORT,
    SERVER_URL: process.env.SERVER_URL,
    CLIENT_URL: process.env.CLIENT_URL,
    ADMIN_URL: process.env.ADMIN_URL,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3002',

    // Database
    DATABASE_URL: process.env.DATABASE_URL,

    //Email
    EMAIL_API_KEY: process.env.EMAIL_SERVICE_API_KEY || process.env.BREVO_API_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY || process.env.EMAIL_SERVICE_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || 'Hirevia <stallyons.tester125@gmail.com>',
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME || 'Hirevia',
    EMAIL_SENDER_ADDRESS: process.env.EMAIL_SENDER_ADDRESS || 'stallyons.tester125@gmail.com',

    //Tokens
    TOKENS: {
        ACCESS: {
            SECRET: process.env.ACCESS_TOKEN_SECRET as string,
            EXPIRY: 3600
        },
        REFRESH: {
            SECRET: process.env.REFRESH_TOKEN_SECRET as string,
            EXPIRY: 3600 * 24 * 365
        }
    },

    // File Uploads
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '') || 10 * 1024 * 1024, // default 10MB

    // AI Provider (Groq)
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',

    // Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

    // Auto-Screening & Assessments
    AUTO_SHORTLIST_THRESHOLD: parseInt(process.env.AUTO_SHORTLIST_THRESHOLD || '70', 10),
    TEST_INVITE_EXPIRY_DAYS: parseInt(process.env.TEST_INVITE_EXPIRY_DAYS || '7', 10),

    // Vapi AI Voice Interview
    VAPI_PRIVATE_KEY: process.env.VAPI_PRIVATE_KEY || '',
    VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID || 'b93d37b4-9e62-4d96-a916-ce0e3d357e73',
    VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET || ''
}


