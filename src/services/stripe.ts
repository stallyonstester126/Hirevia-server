import Stripe from 'stripe'
import config from '../config/config'

const stripeSecret = config.STRIPE_SECRET_KEY || 'mock_secret_key'
export const stripe = new Stripe(stripeSecret, {
    apiVersion: '2024-06-20' as Stripe.StripeConfig['apiVersion']
})

export default {
    createCheckoutSession: async (jobId: string, companyEmail: string, successUrl?: string, cancelUrl?: string) => {
        const clientOrigins = config.CLIENT_URL ? config.CLIENT_URL.split(',') : []
        const fallbackUrl =
            config.FRONTEND_URL ||
            (clientOrigins.length > 1 ? clientOrigins[1].trim() : clientOrigins[0]?.trim()) ||
            'http://localhost:3002'
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
                            name: 'Job Posting Fee',
                            description: 'One-time fee to publish a job posting'
                        },
                        unit_amount: 1000 // $10.00 USD in cents (flat fee)
                    },
                    quantity: 1
                }
            ],
            metadata: {
                jobId
            },
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
