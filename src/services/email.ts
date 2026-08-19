import config from '../config/config'

export default {
    sendEmail: async (to: string[], subject: string, text: string, html?: string) => {
        const apiKey = config.BREVO_API_KEY || config.EMAIL_API_KEY
        if (!apiKey) {
            console.warn('[EmailService] No email API key configured. Skipping email send.')
            return { success: false, error: 'No API key' }
        }

        const recipients = to.map((email) => ({ email }))
        const sender = {
            name: config.EMAIL_SENDER_NAME || 'Hirevia',
            email: config.EMAIL_SENDER_ADDRESS || 'stallyons.tester125@gmail.com'
        }

        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': apiKey,
                    'content-type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    sender,
                    to: recipients,
                    subject,
                    textContent: text,
                    ...(html ? { htmlContent: html } : {})
                })
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                console.error(`[EmailService] Brevo API returned ${response.status}:`, data)
                return { success: false, error: data }
            }

            console.log(`[EmailService] Email sent successfully via Brevo to: ${to.join(', ')} (Message ID: ${data.messageId || 'OK'})`)
            return { success: true, data }
        } catch (error: any) {
            console.error('[EmailService] Failed to send email via Brevo:', error.message || error)
            return { success: false, error }
        }
    }
}
