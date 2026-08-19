import Stripe from 'stripe'
import config from '../config/config'

const stripeSecret = config.STRIPE_SECRET_KEY || 'mock_secret_key'
export const stripe = new Stripe(stripeSecret, {
    apiVersion: '2024-06-20' as Stripe.StripeConfig['apiVersion']
})

const getClientFallbackUrl = () => {
    const clientOrigins = config.CLIENT_URL
        ? config.CLIENT_URL.split(',').map((u) => u.trim()).filter(Boolean)
        : []
    return (
        (clientOrigins.length > 0 ? clientOrigins[0] : '') ||
        config.FRONTEND_URL ||
        'http://localhost:3002'
    )
}

export default {
    createSubscriptionCheckoutSession: async (
        companyId: string,
        companyEmail: string,
        successUrl?: string,
        cancelUrl?: string
    ) => {
        const fallbackUrl = getClientFallbackUrl()
        const success = successUrl || `${fallbackUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`
        const cancel = cancelUrl || `${fallbackUrl}/payment/cancel`

        const companyIdStr = typeof companyId === 'object' && companyId !== null
            ? (companyId as any)._id ? (companyId as any)._id.toString() : (companyId as any).toString()
            : String(companyId)

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: companyEmail,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Hirevia Employer Membership',
                            description: 'One-time membership for unlimited job postings & candidate pipelines'
                        },
                        unit_amount: 1000 // $10.00 USD in cents
                    },
                    quantity: 1
                }
            ],
            metadata: {
                companyId: companyIdStr,
                type: 'SUBSCRIPTION'
            },
            success_url: success,
            cancel_url: cancel
        })

        return session
    },

    createCheckoutSession: async (
        jobId: string,
        companyEmail: string,
        successUrl?: string,
        cancelUrl?: string,
        companyId?: string
    ) => {
        const fallbackUrl = getClientFallbackUrl()
        const success = successUrl || `${fallbackUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`
        const cancel = cancelUrl || `${fallbackUrl}/payment/cancel`

        const jobIdStr = typeof jobId === 'object' && jobId !== null ? (jobId as any).toString() : String(jobId)
        const metadata: Record<string, string> = { jobId: jobIdStr, type: 'JOB_POSTING' }
        if (companyId) {
            const companyIdStr = typeof companyId === 'object' && companyId !== null
                ? (companyId as any)._id ? (companyId as any)._id.toString() : (companyId as any).toString()
                : String(companyId)
            metadata.companyId = companyIdStr
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: companyEmail,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Hirevia Employer Membership',
                            description: 'One-time membership for unlimited job postings'
                        },
                        unit_amount: 1000 // $10.00 USD in cents
                    },
                    quantity: 1
                }
            ],
            metadata,
            success_url: success,
            cancel_url: cancel
        })

        return session
    },

    retrieveSession: async (sessionId: string) => {
        return stripe.checkout.sessions.retrieve(sessionId)
    },

    constructEvent: (rawBody: Buffer, signature: string) => {
        const webhookSecret = config.STRIPE_WEBHOOK_SECRET || 'mock_webhook_secret'
        return stripe.webhooks.constructEvent(rawBody.toString(), signature, webhookSecret)
    }
}
