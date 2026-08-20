import { CustomError } from '../../../utils/errors'
import hashing from '../../../utils/hashing'
import userModel from '../_shared/models/user.model'

export const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
) => {
    if (!currentPassword || !newPassword) {
        throw new CustomError('Current password and new password are required', 400)
    }

    if (newPassword.length < 8) {
        throw new CustomError('New password must be at least 8 characters long', 400)
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(newPassword)) {
        throw new CustomError(
            'New password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
            400
        )
    }

    const user = await userModel.findById(userId).select('+password')
    if (!user) {
        throw new CustomError('User account not found', 404)
    }

    if (!user.password) {
        throw new CustomError('Account does not have a password set. Please use password reset.', 400)
    }

    const isMatch = await hashing.comparePassword(currentPassword, user.password)
    if (!isMatch) {
        throw new CustomError('Current password is incorrect', 400)
    }

    const hashedNewPassword = await hashing.hashPassword(newPassword)
    user.password = hashedNewPassword
    await user.save()

    return { success: true, message: 'Password has been updated successfully' }
}

export const updateAccountProfile = async (
    userId: string,
    data: {
        name?: string
        phoneNumber?: {
            isoCode: string
            countryCode: string
            internationalNumber: string
        }
        timezone?: string
    }
) => {
    const user = await userModel.findById(userId)
    if (!user) {
        throw new CustomError('User account not found', 404)
    }

    if (data.name && data.name.trim().length >= 2) {
        user.name = data.name.trim()
    }

    if (data.phoneNumber) {
        user.phoneNumber = data.phoneNumber
    }

    if (data.timezone) {
        user.timezone = data.timezone
    }

    await user.save()
    const userObj = user.toObject()
    delete (userObj as any).password
    return userObj
}
