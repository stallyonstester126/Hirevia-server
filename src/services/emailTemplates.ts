/**
 * Email HTML & Text Templates for Transactional Emails
 */

export interface IConfirmationEmailData {
    name: string
    confirmationUrl: string
    code?: string
}

export interface IWelcomeEmailData {
    name?: string
    loginUrl: string
}

export interface ITestInviteEmailData {
    candidateName: string
    jobTitle: string
    companyName: string
    testUrl: string
    expiresAt: Date
}

/**
 * Base layout wrapper for consistent branding and responsive email formatting across clients
 */
const baseEmailLayout = (content: string): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Hirevia</title>
    <!--[if mso]>
    <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased; line-height: 1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f6f9; padding: 40px 15px;">
        <tr>
            <td align="center">
                <!-- Email Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
                            <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; text-transform: uppercase;">
                                Hire<span style="color: #3b82f6;">via</span>
                            </span>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px 28px 32px;">
                            ${content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
                            <p style="margin: 0 0 8px 0;">
                                If you did not create an account with Hirevia, please disregard this email.
                            </p>
                            <p style="margin: 0;">
                                &copy; ${new Date().getFullYear()} Hirevia. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

/**
 * Generate Confirmation Email (HTML & Plain Text)
 */
export const getConfirmationEmailTemplate = (data: IConfirmationEmailData) => {
    const { name, confirmationUrl, code } = data

    const htmlContent = `
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">
            Confirm your account
        </h1>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            Hello <strong>${name}</strong>,
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0;">
            Thank you for registering with <strong>Hirevia</strong>. Please click the button below to confirm your account and verify your email address.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; width: 100%;">
            <tr>
                <td align="center">
                    <a href="${confirmationUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Confirm Account
                    </a>
                </td>
            </tr>
        </table>

        ${
            code
                ? `
        <!-- Verification Code Block -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0; width: 100%; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 16px;">
            <tr>
                <td align="center" style="font-size: 13px; color: #64748b;">
                    <span style="display: block; margin-bottom: 6px; font-weight: 500;">Or enter your verification code manually:</span>
                    <span style="font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #0f172a; font-family: monospace;">${code}</span>
                </td>
            </tr>
        </table>
        `
                : ''
        }

        <!-- Raw Link Fallback -->
        <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0;">
            If the button above does not work, copy and paste the following link into your web browser:
        </p>
        <p style="font-size: 12px; line-height: 1.4; margin: 0 0 24px 0; word-break: break-all; background-color: #f1f5f9; padding: 10px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <a href="${confirmationUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">
                ${confirmationUrl}
            </a>
        </p>

        <!-- Security Note -->
        <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <strong>Security Notice:</strong> This single-use verification link was requested for your account. Please complete your verification to get started.
        </p>
    `

    const textContent = `Hello ${name},\n\nThank you for registering with Hirevia.\n\nPlease confirm your account by visiting the link below:\n${confirmationUrl}\n${code ? `\nYour verification code: ${code}\n` : ''}\nIf you did not create an account, you can safely ignore this email.\n\n— The Hirevia Team`

    return {
        html: baseEmailLayout(htmlContent),
        text: textContent
    }
}

/**
 * Generate Welcome / Account Confirmed Email (HTML & Plain Text)
 */
export const getWelcomeEmailTemplate = (data: IWelcomeEmailData) => {
    const { name, loginUrl } = data

    const htmlContent = `
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">
            Account Confirmed! 🎉
        </h1>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            ${name ? `Hello <strong>${name}</strong>,` : 'Hello,'}
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0;">
            Your Hirevia account has been successfully verified and activated. You can now log in to explore job listings, manage applications, and connect with opportunities.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; width: 100%;">
            <tr>
                <td align="center">
                    <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Go to Login
                    </a>
                </td>
            </tr>
        </table>

        <!-- Raw Link Fallback -->
        <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0;">
            Direct link to login:
        </p>
        <p style="font-size: 12px; line-height: 1.4; margin: 0 0 16px 0; word-break: break-all; background-color: #f1f5f9; padding: 10px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">
                ${loginUrl}
            </a>
        </p>
    `

    const textContent = `Welcome to Hirevia!\n\nYour account has been successfully confirmed.\n\nYou can log in here:\n${loginUrl}\n\n— The Hirevia Team`

    return {
        html: baseEmailLayout(htmlContent),
        text: textContent
    }
}

/**
 * Generate Assessment Test Invite Email (HTML & Plain Text)
 */
export const getTestInviteEmailTemplate = (data: ITestInviteEmailData) => {
    const { candidateName, jobTitle, companyName, testUrl, expiresAt } = data
    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })

    const htmlContent = `
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">
            Invitation to Complete Assessment 🎯
        </h1>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            Hello <strong>${candidateName}</strong>,
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            Great news! Based on your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>, your profile has been shortlisted to move forward to the next stage of our evaluation.
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0;">
            Please complete your assessment prior to the deadline on <strong>${formattedExpiry}</strong>.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; width: 100%;">
            <tr>
                <td align="center">
                    <a href="${testUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Start Assessment
                    </a>
                </td>
            </tr>
        </table>

        <!-- Direct Link Fallback -->
        <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0;">
            If the button above does not work, open this link directly in your browser:
        </p>
        <p style="font-size: 12px; line-height: 1.4; margin: 0 0 24px 0; word-break: break-all; background-color: #f1f5f9; padding: 10px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <a href="${testUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">
                ${testUrl}
            </a>
        </p>

        <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <strong>Important:</strong> This assessment link is uniquely assigned to your candidate record and will expire on ${formattedExpiry}.
        </p>
    `

    const textContent = `Hello ${candidateName},\n\nYou have been shortlisted for ${jobTitle} at ${companyName}.\nPlease complete your assessment before ${formattedExpiry} using this link:\n${testUrl}\n\n— The Hirevia Team`

    return {
        html: baseEmailLayout(htmlContent),
        text: textContent
    }
}

export interface IInterviewInviteEmailData {
    candidateName: string
    jobTitle: string
    companyName: string
    interviewUrl: string
    expiresAt: Date | string
}

/**
 * Generate AI Voice Interview Invite Email (HTML & Plain Text)
 */
export const getInterviewInviteEmailTemplate = (data: IInterviewInviteEmailData) => {
    const { candidateName, jobTitle, companyName, interviewUrl, expiresAt } = data
    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })

    const htmlContent = `
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">
            Invitation to AI Voice Interview 🎙️
        </h1>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            Hello <strong>${candidateName}</strong>,
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            Congratulations! Your written assessment for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been reviewed and you have advanced to the <strong>AI Voice Interview</strong> stage.
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0;">
            In this stage, you will have a real-time conversational voice interview with our AI hiring assistant directly in your browser. Please ensure your microphone is enabled and complete the interview before <strong>${formattedExpiry}</strong>.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; width: 100%;">
            <tr>
                <td align="center">
                    <a href="${interviewUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Start Voice Interview 🎙️
                    </a>
                </td>
            </tr>
        </table>

        <!-- Direct Link Fallback -->
        <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0;">
            If the button above does not work, open this link directly in your browser:
        </p>
        <p style="font-size: 12px; line-height: 1.4; margin: 0 0 24px 0; word-break: break-all; background-color: #f1f5f9; padding: 10px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <a href="${interviewUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">
                ${interviewUrl}
            </a>
        </p>

        <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <strong>Important:</strong> This voice interview link is uniquely assigned to your candidate record and will expire on ${formattedExpiry}.
        </p>
    `

    const textContent = `Hello ${candidateName},\n\nYou have advanced to the AI Voice Interview stage for ${jobTitle} at ${companyName}.\nPlease complete your voice interview before ${formattedExpiry} using this link:\n${interviewUrl}\n\n— The Hirevia Team`

    return {
        html: baseEmailLayout(htmlContent),
        text: textContent
    }
}

export interface IPasswordResetEmailData {
    name: string
    resetUrl: string
    code?: string
    expiresInHours?: number
}

/**
 * Generate Password Reset Request Email (HTML & Plain Text)
 */
export const getPasswordResetEmailTemplate = (data: IPasswordResetEmailData) => {
    const { name, resetUrl, code, expiresInHours = 1 } = data

    const htmlContent = `
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">
            Reset Your Hirevia Password 🔒
        </h1>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            Hello <strong>${name}</strong>,
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0;">
            We received a request to reset the password for your Hirevia account. Click the button below to choose a new password. This link is valid for <strong>${expiresInHours} hour${expiresInHours > 1 ? 's' : ''}</strong>.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; width: 100%;">
            <tr>
                <td align="center">
                    <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Reset Password
                    </a>
                </td>
            </tr>
        </table>

        ${
            code
                ? `
        <!-- Verification Code Block -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0; width: 100%; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 16px;">
            <tr>
                <td align="center" style="font-size: 13px; color: #64748b;">
                    <span style="display: block; margin-bottom: 6px; font-weight: 500;">Verification Code:</span>
                    <span style="font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #0f172a; font-family: monospace;">${code}</span>
                </td>
            </tr>
        </table>
        `
                : ''
        }

        <!-- Direct Link Fallback -->
        <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0;">
            If the button above does not work, copy and paste this link into your web browser:
        </p>
        <p style="font-size: 12px; line-height: 1.4; margin: 0 0 24px 0; word-break: break-all; background-color: #f1f5f9; padding: 10px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">
                ${resetUrl}
            </a>
        </p>

        <!-- Security Note -->
        <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.
        </p>
    `

    const textContent = `Hello ${name},\n\nWe received a request to reset your Hirevia password.\n\nPlease visit the link below to set a new password:\n${resetUrl}\n${code ? `\nVerification Code: ${code}\n` : ''}\nThis link expires in ${expiresInHours} hour.\n\nIf you did not request this, you can safely ignore this email.\n\n— The Hirevia Team`

    return {
        html: baseEmailLayout(htmlContent),
        text: textContent
    }
}

export interface IPasswordResetSuccessEmailData {
    name: string
    loginUrl: string
}

/**
 * Generate Password Reset Success Confirmation Email (HTML & Plain Text)
 */
export const getPasswordResetSuccessEmailTemplate = (data: IPasswordResetSuccessEmailData) => {
    const { name, loginUrl } = data

    const htmlContent = `
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">
            Password Reset Successful ✅
        </h1>
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
            Hello <strong>${name}</strong>,
        </p>
        <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0;">
            Your Hirevia account password has been successfully reset. You can now log in using your new password.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; width: 100%;">
            <tr>
                <td align="center">
                    <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        Sign In Now
                    </a>
                </td>
            </tr>
        </table>

        <!-- Security Note -->
        <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <strong>Security Notice:</strong> If you did not make this change, please immediately contact our support team to secure your account.
        </p>
    `

    const textContent = `Hello ${name},\n\nYour Hirevia password has been successfully reset.\n\nYou can log in with your new password here:\n${loginUrl}\n\nIf you did not make this change, please contact support immediately.\n\n— The Hirevia Team`

    return {
        html: baseEmailLayout(htmlContent),
        text: textContent
    }
}

