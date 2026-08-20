import responseMessage from '../../../constant/responseMessage'
import parsers from '../../../utils/parsers'
import { IForgotPasswordRequest, ILoginRequest, IRegisterRequest, IResetPasswordRequest } from './types/authentication.interface'
import dateAndTime from '../../../utils/date-and-time'
import { CustomError } from '../../../utils/errors'
import query from '../_shared/repo/user.repository'
import hashing from '../../../utils/hashing'
import code from '../../../utils/code'
import { IUser } from '../_shared/types/users.interface'
import { EUserRoles } from '../../../constant/users'
import emailService from '../../../services/email'
import { getConfirmationEmailTemplate, getPasswordResetEmailTemplate, getPasswordResetSuccessEmailTemplate, getWelcomeEmailTemplate } from '../../../services/emailTemplates'
import logger from '../../../handlers/logger'
import validate from './validation/validations'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import jwt from '../../../utils/jwt'
import config from '../../../config/config'
import { IToken } from '../_shared/types/token.interface'
import tokenRepository from '../_shared/repo/token.repository'

dayjs.extend(utc)

export const registrationService = async (payload: IRegisterRequest) => {
    const { name, phoneNumber, email, password, role } = payload

    // Parsing and validating phone number
    const { countryCode, internationalNumber, isoCode } = parsers.parsePhoneNumber('+' + phoneNumber)
    if (!countryCode || !internationalNumber || !isoCode) {
        throw new CustomError(responseMessage.auth.INVALID_PHONE_NUMBER, 422)
    }

    // Extracting country timezone
    const timezone = dateAndTime.countryTimezone(isoCode)
    if (!timezone || timezone.length === 0) {
        throw new CustomError(responseMessage.auth.INVALID_PHONE_NUMBER, 422)
    }

    //Validate if user already exists
    await validate.userAlreadyExistsViaEmail(email)

    //Encrypting password
    const hashedPassword = await hashing.hashPassword(password)

    //Account confimation token and code generation
    const token = code.generateRandomId()
    const OTP = code.generateOTP(6)

    const userObj: IUser = {
        name,
        email,
        phoneNumber: {
            countryCode,
            isoCode,
            internationalNumber
        },
        accountConfimation: {
            status: false,
            token,
            code: OTP,
            timestamp: null
        },
        passwordReset: {
            token: null,
            expiry: null,
            lastResetAt: null
        },
        lastLoginAt: null,
        role: role || EUserRoles.SEEKER,
        timezone: timezone[0].name,
        password: hashedPassword,
        consent: true
    }

    //adding user to db
    const newUser = await query.createUser(userObj)

    //Sending confimation emails
    const confimationURL = `${config.FRONTEND_URL}/confirmation/${token}?code=${OTP}`
    const to = [email]
    const subject = `Confirm your account`
    const emailTemplate = getConfirmationEmailTemplate({
        name,
        confirmationUrl: confimationURL,
        code: OTP
    })

    console.log(`\n======================================================`)
    console.log(`[AUTH] User Registered: ${email}`)
    console.log(`[AUTH] Confirmation Code (OTP): ${OTP}`)
    console.log(`[AUTH] Direct Verification URL: ${confimationURL}`)
    console.log(`======================================================\n`)

    logger.info(`Verification URL: ${confimationURL}`)
    emailService.sendEmail(to, subject, emailTemplate.text, emailTemplate.html).catch((error) => {
        logger.error('Error sending email', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            meta: error
        })
    })

    return {
        success: true,
        _id: newUser._id,
        token
    }
}

export const accountConfirmationService = async (token: string, code: string) => {
    const user = await query.findUserByConfirmationTokenAndCode(token, code)
    if (!user) {
        throw new CustomError(responseMessage.auth.USER_NOT_EXIST, 404)
    }

    //Check if account is already confirmed
    if (user.accountConfimation.status) {
        throw new CustomError(responseMessage.auth.ALREADY_CONFIRMED('Account'), 400)
    }

    //if not, lets confirm
    user.accountConfimation.status = true
    user.accountConfimation.timestamp = dayjs().utc().toDate()

    await user.save()

    //Sending welcome / confirmation emails
    const to = [user.email]
    const subject = `Welcome to Hirevia!`
    const welcomeTemplate = getWelcomeEmailTemplate({
        name: user.name,
        loginUrl: `${config.FRONTEND_URL}/login`
    })

    emailService.sendEmail(to, subject, welcomeTemplate.text, welcomeTemplate.html).catch((error) => {
        logger.error('Error sending email', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            meta: error
        })
    })

    return {
        success: true,
        _id: user._id
    }
}

export const loginService = async (payload: ILoginRequest) => {
    const { email, password } = payload

    //Check if the user is registered
    const user = await query.findUserByEmail(email, '+password')
    if (!user) {
        throw new CustomError(responseMessage.NOT_FOUND('User'), 404)
    }

    //Validate password
    if (!user.password) {
        throw new CustomError(responseMessage.auth.INVALID_EMAIL_OR_PASSWORD, 400)
    }
    const isValidPassword = await hashing.comparePassword(password, user.password)
    if (!isValidPassword) {
        throw new CustomError(responseMessage.auth.INVALID_EMAIL_OR_PASSWORD, 400)
    }

    // Check if account is suspended
    if (user.isSuspended) {
        throw new CustomError('Account suspended', 403)
    }

    //Genrate tokens
    const accessToken = jwt.generateToken({ userId: user._id }, config.TOKENS.ACCESS.SECRET, config.TOKENS.ACCESS.EXPIRY)
    const refreshToken = jwt.generateToken({ userId: user._id }, config.TOKENS.REFRESH.SECRET, config.TOKENS.REFRESH.EXPIRY)

    user.lastLoginAt = dayjs().utc().toDate()

    await user.save()

    //Storing refresh token into db
    const token: IToken = {
        token: refreshToken
    }
    await tokenRepository.createToken(token)

    const userObj = user.toObject() as any
    delete userObj.password

    return {
        success: true,
        user: userObj,
        accessToken: accessToken,
        refreshToken: refreshToken
    }
}

export const googleAuthInitiateService = (role?: string, redirectPath?: string) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
        throw new CustomError('Google OAuth is not configured on the server', 500)
    }

    const statePayload = {
        role: role === EUserRoles.COMPANY ? EUserRoles.COMPANY : EUserRoles.SEEKER,
        redirect: redirectPath || ''
    }
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const options = {
        redirect_uri: config.GOOGLE_CALLBACK_URL,
        client_id: config.GOOGLE_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'select_account',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid'
        ].join(' '),
        state
    }
    const qs = new URLSearchParams(options)
    return `${rootUrl}?${qs.toString()}`
}

export const googleAuthCallbackService = async (codeParam: string, stateParam?: string) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
        throw new CustomError('Google OAuth is not configured on the server', 500)
    }

    let parsedState: { role?: string; redirect?: string } = {}
    if (stateParam) {
        try {
            parsedState = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'))
        } catch (_) {
            parsedState = {}
        }
    }

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code: codeParam,
            client_id: config.GOOGLE_CLIENT_ID,
            client_secret: config.GOOGLE_CLIENT_SECRET,
            redirect_uri: config.GOOGLE_CALLBACK_URL,
            grant_type: 'authorization_code'
        })
    })

    const tokenData = (await tokenResponse.json()) as any
    if (!tokenResponse.ok || !tokenData.access_token) {
        const errorDesc = tokenData.error_description || tokenData.error || 'Failed to exchange code with Google'
        logger.error(`[GoogleAuth] Token exchange failed: ${errorDesc}`)
        throw new CustomError(errorDesc, 400)
    }

    // 2. Fetch Google profile
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const googleUser = (await userResponse.json()) as any
    if (!userResponse.ok || !googleUser.email) {
        throw new CustomError('Failed to fetch user profile from Google', 400)
    }
    if (!googleUser.email_verified) {
        throw new CustomError('Google email address is not verified', 400)
    }

    const email = googleUser.email.toLowerCase()
    const googleId = googleUser.sub

    // 3. Find existing user by googleId or email
    let user = await query.findUserByGoogleId(googleId)
    if (!user) {
        user = await query.findUserByEmail(email)
    }

    if (user) {
        if (user.isSuspended) {
            throw new CustomError('Account suspended', 403)
        }

        if (!user.googleId) {
            user.googleId = googleId
        }
        if (!user.authProvider || user.authProvider === 'local') {
            user.authProvider = 'google'
        }
        if (!user.profilePicture && googleUser.picture) {
            user.profilePicture = googleUser.picture
        }
        if (!user.accountConfimation?.status) {
            user.accountConfimation.status = true
            user.accountConfimation.timestamp = dayjs().utc().toDate()
        }
        user.lastLoginAt = dayjs().utc().toDate()
        await user.save()
    } else {
        // 4. Create new user with Google identity
        const targetRole =
            parsedState.role && Object.values(EUserRoles).includes(parsedState.role as EUserRoles)
                ? (parsedState.role as EUserRoles)
                : EUserRoles.SEEKER

        const randomPassword = await hashing.hashPassword(code.generateRandomId() + code.generateRandomId())
        const newUserPayload: IUser = {
            name: googleUser.name || googleUser.given_name || email.split('@')[0],
            email,
            phoneNumber: {
                countryCode: '1',
                isoCode: 'US',
                internationalNumber: ''
            },
            timezone: 'UTC',
            password: randomPassword,
            role: targetRole,
            googleId,
            authProvider: 'google',
            profilePicture: googleUser.picture || null,
            accountConfimation: {
                status: true,
                token: code.generateRandomId(),
                code: '000000',
                timestamp: dayjs().utc().toDate()
            },
            passwordReset: {
                token: null,
                expiry: null,
                lastResetAt: null
            },
            lastLoginAt: dayjs().utc().toDate(),
            consent: true
        }

        user = await query.createUser(newUserPayload)
    }

    // 5. Generate tokens
    const accessToken = jwt.generateToken({ userId: user._id }, config.TOKENS.ACCESS.SECRET, config.TOKENS.ACCESS.EXPIRY)
    const refreshToken = jwt.generateToken({ userId: user._id }, config.TOKENS.REFRESH.SECRET, config.TOKENS.REFRESH.EXPIRY)

    const token: IToken = {
        token: refreshToken
    }
    await tokenRepository.createToken(token)

    // 6. Determine redirect path
    let redirectPath = '/seeker'
    if (user.role === EUserRoles.COMPANY) {
        redirectPath = '/company'
    } else if (user.role === EUserRoles.ADMIN) {
        redirectPath = '/admin'
    }

    if (parsedState.redirect && parsedState.redirect.startsWith('/')) {
        redirectPath = parsedState.redirect
    }

    const userObj = user.toObject() as any
    delete userObj.password

    return {
        success: true,
        user: userObj,
        accessToken,
        refreshToken,
        redirectPath
    }
}

export const forgotPasswordService = async (payload: IForgotPasswordRequest) => {
    const { email } = payload

    const user = await query.findUserByEmail(email)
    if (!user) {
        // Return generic success message for privacy/security
        return {
            success: true,
            message: 'If an account exists with this email, password reset instructions have been sent.'
        }
    }

    // Generate secure reset token & 6-digit OTP code
    const resetToken = code.generateRandomId() + code.generateRandomId()
    const resetCode = code.generateOTP(6)
    // Expiry: 1 hour from now
    const expiry = dayjs().utc().add(1, 'hour').valueOf()

    user.passwordReset = {
        token: resetToken,
        code: resetCode,
        expiry,
        lastResetAt: user.passwordReset?.lastResetAt || null
    }

    await user.save()

    const resetURL = `${config.FRONTEND_URL}/reset-password?token=${resetToken}&code=${resetCode}`
    const to = [email]
    const subject = `Reset Your Hirevia Password`
    const emailTemplate = getPasswordResetEmailTemplate({
        name: user.name,
        resetUrl: resetURL,
        code: resetCode,
        expiresInHours: 1
    })

    console.log(`\n======================================================`)
    console.log(`[AUTH] Password Reset Requested: ${email}`)
    console.log(`[AUTH] Reset Code (OTP): ${resetCode}`)
    console.log(`[AUTH] Reset URL: ${resetURL}`)
    console.log(`======================================================\n`)

    logger.info(`Password Reset URL: ${resetURL}`)
    emailService.sendEmail(to, subject, emailTemplate.text, emailTemplate.html).catch((error) => {
        logger.error('Error sending password reset email', {
            meta: error
        })
    })

    return {
        success: true,
        message: 'Password reset instructions have been sent to your email.'
    }
}

export const resetPasswordService = async (payload: IResetPasswordRequest) => {
    const { token, newPassword, code: providedCode } = payload

    const user = await query.findUserByResetToken(token, '+password')
    if (!user || !user.passwordReset || !user.passwordReset.token) {
        throw new CustomError('Password reset link is invalid or has already been used. Please request a new one.', 400)
    }

    // Check expiry
    if (user.passwordReset.expiry && user.passwordReset.expiry < Date.now()) {
        throw new CustomError('Password reset link has expired. Please request a new one.', 400)
    }

    // Check code if provided
    if (providedCode && user.passwordReset.code && user.passwordReset.code !== providedCode) {
        throw new CustomError('Invalid verification code provided.', 400)
    }

    // Hash new password
    const hashedPassword = await hashing.hashPassword(newPassword)

    user.password = hashedPassword
    user.passwordReset = {
        token: null,
        code: null,
        expiry: null,
        lastResetAt: dayjs().utc().toDate()
    }

    // If account was created with Google without password before, allow standard login now
    if (user.authProvider === 'google') {
        user.authProvider = 'local'
    }

    await user.save()

    // Send confirmation email
    const to = [user.email]
    const subject = `Your Hirevia Password Has Been Reset`
    const successTemplate = getPasswordResetSuccessEmailTemplate({
        name: user.name,
        loginUrl: `${config.FRONTEND_URL}/login`
    })

    emailService.sendEmail(to, subject, successTemplate.text, successTemplate.html).catch((error) => {
        logger.error('Error sending password reset success email', {
            meta: error
        })
    })

    return {
        success: true,
        message: 'Password has been reset successfully! You can now log in with your new password.'
    }
}

