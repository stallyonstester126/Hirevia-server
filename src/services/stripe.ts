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
                companyId,
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

        const metadata: Record<string, string> = { jobId, type: 'JOB_POSTING' }
        if (companyId) metadata.companyId = companyId

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
