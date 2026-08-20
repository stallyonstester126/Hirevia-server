import { accountConfirmationService, googleAuthCallbackService, googleAuthInitiateService, loginService, registrationService } from '../../APIs/user/authentication/authentication.service'
import query from '../../APIs/user/_shared/repo/user.repository'
import validate from '../../APIs/user/authentication/validation/validations'
import emailService from '../../services/email'
import { CustomError } from '../../utils/errors'
import parsers from '../../utils/parsers'
import responseMessage from '../../constant/responseMessage'
import dateAndTime from '../../utils/date-and-time'
import code from '../../utils/code'
import hashing from '../../utils/hashing'
import { IRegisterRequest } from '../../APIs/user/authentication/types/authentication.interface'
import jwt from '../../utils/jwt'
import tokenRepository from '../../APIs/user/_shared/repo/token.repository'
import { EUserRoles } from '../../constant/users'
import config from '../../config/config'

jest.mock('../../APIs/user/_shared/repo/user.repository')
jest.mock('../../services/email', () => ({
    sendEmail: jest.fn().mockResolvedValue(undefined) // Mocking as a resolved promise
}))

process.env.ACCESS_TOKEN_SECRET = 'access-secret'
process.env.REFRESH_TOKEN_SECRET = 'refresh-secret'

jest.mock('../../utils/parsers')
jest.mock('../../utils/date-and-time')
jest.mock('../../APIs/user/authentication/validation/validations')
jest.mock('../../utils/hashing')
jest.mock('../../utils/code')

jest.mock('../../utils/jwt') // Mock the jwt module
jest.mock('../../APIs/user/_shared/repo/token.repository') // Mock the tokenRepository module

describe('registrationService', () => {
    const mockPayload: IRegisterRequest = {
        name: 'John Doe',
        phoneNumber: '1234567890',
        email: 'john.doe@example.com',
        password: 'securepassword',
        consent: true,
        role: EUserRoles.SEEKER
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should throw an error if phone number is invalid', async () => {
        ;(parsers.parsePhoneNumber as jest.Mock).mockReturnValue({ countryCode: null, internationalNumber: null, isoCode: null })

        await expect(registrationService(mockPayload)).rejects.toThrow(new CustomError(responseMessage.auth.INVALID_PHONE_NUMBER, 422))
    })

    it('should throw an error if timezone is invalid', async () => {
        ;(parsers.parsePhoneNumber as jest.Mock).mockReturnValue({ countryCode: 'US', internationalNumber: '1234567890', isoCode: 'US' })
        ;(dateAndTime.countryTimezone as jest.Mock).mockReturnValue([])

        await expect(registrationService(mockPayload)).rejects.toThrow(new CustomError(responseMessage.auth.INVALID_PHONE_NUMBER, 422))
    })

    it('should validate if user already exists via email', async () => {
        ;(parsers.parsePhoneNumber as jest.Mock).mockReturnValue({ countryCode: 'US', internationalNumber: '1234567890', isoCode: 'US' })
        ;(dateAndTime.countryTimezone as jest.Mock).mockReturnValue([{ name: 'America/New_York' }])
        ;(validate.userAlreadyExistsViaEmail as jest.Mock).mockRejectedValue(
            new CustomError(responseMessage.auth.ALREADY_EXISTS(mockPayload.email, 'User'), 422)
        )

        await expect(registrationService(mockPayload)).rejects.toThrow('User already exists')
    })

    it('should successfully register a user and send a confirmation email', async () => {
        ;(parsers.parsePhoneNumber as jest.Mock).mockReturnValue({ countryCode: 'US', internationalNumber: '1234567890', isoCode: 'US' })
        ;(dateAndTime.countryTimezone as jest.Mock).mockReturnValue([{ name: 'America/New_York' }])
        ;(validate.userAlreadyExistsViaEmail as jest.Mock).mockResolvedValue(undefined)
        ;(hashing.hashPassword as jest.Mock).mockResolvedValue('hashedpassword')
        ;(code.generateRandomId as jest.Mock).mockReturnValue('randomToken')
        ;(code.generateOTP as jest.Mock).mockReturnValue('123456')
        ;(query.createUser as jest.Mock).mockResolvedValue({ _id: 'newUserId' })

        const response = await registrationService(mockPayload)

        expect(response).toEqual({ success: true, _id: 'newUserId', token: 'randomToken' })
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            [mockPayload.email],
            'Confirm your account',
            expect.stringContaining(`Hello ${mockPayload.name}`),
            expect.stringContaining('Confirm Account')
        )
    })
})

describe('loginService', () => {
    const mockPayload = {
        email: 'john.doe@example.com',
        password: 'securepassword'
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should throw an error if user does not exist', async () => {
        ;(query.findUserByEmail as jest.Mock).mockResolvedValue(null)

        await expect(loginService(mockPayload)).rejects.toThrow(new CustomError(responseMessage.NOT_FOUND('User'), 404))
    })

    it('should throw an error if password is invalid', async () => {
        const mockUser = { _id: 'userId', password: 'hashedPassword' }
        ;(query.findUserByEmail as jest.Mock).mockResolvedValue(mockUser)
        ;(hashing.comparePassword as jest.Mock).mockResolvedValue(false)

        await expect(loginService(mockPayload)).rejects.toThrow(new CustomError(responseMessage.auth.INVALID_EMAIL_OR_PASSWORD, 400))
    })

    it('should successfully log in a user and return tokens', async () => {
        const mockUser = {
            _id: 'userId',
            password: 'hashedPassword',
            save: jest.fn(),
            toObject: jest.fn().mockReturnValue({ _id: 'userId' })
        }
        ;(query.findUserByEmail as jest.Mock).mockResolvedValue(mockUser)
        ;(hashing.comparePassword as jest.Mock).mockResolvedValue(true)
        ;(jwt.generateToken as jest.Mock).mockImplementation(() => {
            return 'mockDefaultToken'
        })

        // Generate the tokens
        ;(tokenRepository.createToken as jest.Mock).mockResolvedValue(undefined)

        const response = await loginService(mockPayload)

        expect(response).toEqual({
            success: true,
            user: { _id: 'userId' },
            accessToken: 'mockDefaultToken',
            refreshToken: 'mockDefaultToken'
        })
        expect(mockUser.save).toHaveBeenCalled() // Ensure user.save() is called
        expect(tokenRepository.createToken).toHaveBeenCalledWith({ token: 'mockDefaultToken' })
    })
})

describe('accountConfirmationService', () => {
    const mockSave = jest.fn()
    const mockUser = {
        _id: '12345',
        name: 'John Doe',
        email: 'test@example.com',
        accountConfimation: {
            status: false,
            timestamp: null
        },
        save: mockSave
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should throw an error if user does not exist', async () => {
        ;(query.findUserByConfirmationTokenAndCode as jest.Mock).mockResolvedValue(null)

        await expect(accountConfirmationService('token', 'code')).rejects.toThrow(new CustomError('Account does not exist', 404))
    })

    it('should throw an error if account is already confirmed', async () => {
        ;(query.findUserByConfirmationTokenAndCode as jest.Mock).mockResolvedValue({
            ...mockUser,
            accountConfimation: { status: true }
        })

        await expect(accountConfirmationService('token', 'code')).rejects.toThrow(new CustomError('Account already CONFIRMED', 400))
    })

    it('should confirm the account and send an email', async () => {
        ;(query.findUserByConfirmationTokenAndCode as jest.Mock).mockResolvedValue(mockUser)
        await accountConfirmationService('token', 'code')

        expect(mockUser.accountConfimation.status).toBe(true)
        expect(mockUser.accountConfimation.timestamp).toBeTruthy()
        expect(mockSave).toHaveBeenCalledTimes(1)
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            [mockUser.email],
            'Welcome to Hirevia!',
            expect.stringContaining('Welcome to Hirevia!'),
            expect.stringContaining('Account Confirmed!')
        )
    })
})

describe('googleAuthServices', () => {
    beforeAll(() => {
        config.GOOGLE_CLIENT_ID = 'test-google-client-id'
        config.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
        config.GOOGLE_CALLBACK_URL = 'http://localhost:3000/v1/auth/google/callback'
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('googleAuthInitiateService should generate a valid Google OAuth consent URL', () => {
        const url = googleAuthInitiateService(EUserRoles.SEEKER, '/seeker')
        expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
        expect(url).toContain('client_id=test-google-client-id')
        expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fv1%2Fauth%2Fgoogle%2Fcallback')
        expect(url).toContain('response_type=code')
        expect(url).toContain('scope=')
    })

    it('googleAuthCallbackService should exchange code, fetch profile, link existing user, and issue tokens', async () => {
        // Mock global fetch for token exchange and userinfo
        const originalFetch = global.fetch
        global.fetch = jest.fn()
            .mockImplementationOnce(async () => ({
                ok: true,
                json: async () => ({ access_token: 'google_mock_access_token' })
            }))
            .mockImplementationOnce(async () => ({
                ok: true,
                json: async () => ({
                    sub: 'google-sub-123',
                    email: 'existing.google@example.com',
                    email_verified: true,
                    name: 'Existing Google User',
                    picture: 'https://lh3.googleusercontent.com/photo.jpg'
                })
            })) as any

        const mockExistingUser = {
            _id: 'user_123',
            name: 'Existing Google User',
            email: 'existing.google@example.com',
            role: EUserRoles.SEEKER,
            googleId: null,
            authProvider: 'local',
            accountConfimation: { status: true },
            save: jest.fn().mockResolvedValue(true),
            toObject: jest.fn().mockReturnValue({
                _id: 'user_123',
                name: 'Existing Google User',
                email: 'existing.google@example.com',
                role: EUserRoles.SEEKER
            })
        }

        ;(query.findUserByGoogleId as jest.Mock).mockResolvedValue(null)
        ;(query.findUserByEmail as jest.Mock).mockResolvedValue(mockExistingUser)
        ;(jwt.generateToken as jest.Mock)
            .mockReturnValueOnce('mock_access_jwt')
            .mockReturnValueOnce('mock_refresh_jwt')
        ;(tokenRepository.createToken as jest.Mock).mockResolvedValue({ token: 'mock_refresh_jwt' })

        const result = await googleAuthCallbackService('valid_auth_code')

        expect(result.success).toBe(true)
        expect(result.accessToken).toBe('mock_access_jwt')
        expect(result.refreshToken).toBe('mock_refresh_jwt')
        expect(result.redirectPath).toBe('/seeker')
        expect(mockExistingUser.googleId).toBe('google-sub-123')
        expect(mockExistingUser.authProvider).toBe('google')
        expect(mockExistingUser.save).toHaveBeenCalled()

        global.fetch = originalFetch
    })

    it('googleAuthCallbackService should create a new user when no account matches email or googleId', async () => {
        const originalFetch = global.fetch
        global.fetch = jest.fn()
            .mockImplementationOnce(async () => ({
                ok: true,
                json: async () => ({ access_token: 'google_mock_access_token_2' })
            }))
            .mockImplementationOnce(async () => ({
                ok: true,
                json: async () => ({
                    sub: 'google-new-sub-456',
                    email: 'brandnew.user@example.com',
                    email_verified: true,
                    name: 'Brand New User',
                    picture: 'https://lh3.googleusercontent.com/new.jpg'
                })
            })) as any

        const mockCreatedUser = {
            _id: 'user_new_456',
            name: 'Brand New User',
            email: 'brandnew.user@example.com',
            role: EUserRoles.SEEKER,
            googleId: 'google-new-sub-456',
            authProvider: 'google',
            accountConfimation: { status: true },
            toObject: jest.fn().mockReturnValue({
                _id: 'user_new_456',
                name: 'Brand New User',
                email: 'brandnew.user@example.com',
                role: EUserRoles.SEEKER
            })
        }

        ;(query.findUserByGoogleId as jest.Mock).mockResolvedValue(null)
        ;(query.findUserByEmail as jest.Mock).mockResolvedValue(null)
        ;(query.createUser as jest.Mock).mockResolvedValue(mockCreatedUser)
        ;(hashing.hashPassword as jest.Mock).mockResolvedValue('random_hashed_pass')
        ;(jwt.generateToken as jest.Mock)
            .mockReturnValueOnce('mock_access_jwt_new')
            .mockReturnValueOnce('mock_refresh_jwt_new')
        ;(tokenRepository.createToken as jest.Mock).mockResolvedValue({ token: 'mock_refresh_jwt_new' })

        const result = await googleAuthCallbackService('valid_new_code')

        expect(result.success).toBe(true)
        expect(query.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'brandnew.user@example.com',
                googleId: 'google-new-sub-456',
                authProvider: 'google'
            })
        )
        expect(result.accessToken).toBe('mock_access_jwt_new')
        expect(result.redirectPath).toBe('/seeker')

        global.fetch = originalFetch
    })
})
