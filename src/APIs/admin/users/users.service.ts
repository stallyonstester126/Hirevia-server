import userModel from '../../user/_shared/models/user.model'
import { CustomError } from '../../../utils/errors'
import { EUserRoles } from '../../../constant/users'

export const sanitizeUser = (user: any) => {
    const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user }
    delete obj.password
    if (obj.accountConfimation) {
        delete obj.accountConfimation.token
        delete obj.accountConfimation.code
    }
    if (obj.passwordReset) {
        delete obj.passwordReset.token
    }
    return obj
}

export const getUsers = async (
    page: number = 1,
    limit: number = 10,
    role?: EUserRoles,
    isSuspended?: boolean
) => {
    const filter: any = {}
    if (role) {
        filter.role = role
    }
    if (typeof isSuspended === 'boolean') {
        filter.isSuspended = isSuspended
    }

    const skip = (page - 1) * limit
    const [users, total] = await Promise.all([
        userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        userModel.countDocuments(filter)
    ])

    return {
        users: users.map(sanitizeUser),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }
}

export const getUserById = async (userId: string) => {
    const user = await userModel.findById(userId)
    if (!user) {
        throw new CustomError('User not found', 404)
    }
    return sanitizeUser(user)
}

export const suspendUser = async (adminUserId: string, targetUserId: string, reason?: string) => {
    // 1. Guard against self-suspension
    if (adminUserId.toString() === targetUserId.toString()) {
        throw new CustomError('Admins cannot suspend their own account', 400)
    }

    const targetUser = await userModel.findById(targetUserId)
    if (!targetUser) {
        throw new CustomError('User not found', 404)
    }

    // 2. Guard against suspending another ADMIN
    if (targetUser.role === EUserRoles.ADMIN) {
        throw new CustomError('Cannot suspend another administrator account', 403)
    }

    targetUser.isSuspended = true
    targetUser.suspendedAt = new Date()
    targetUser.suspensionReason = reason || 'Suspended by administrator'
    await targetUser.save()

    return sanitizeUser(targetUser)
}

export const reactivateUser = async (targetUserId: string) => {
    const targetUser = await userModel.findById(targetUserId)
    if (!targetUser) {
        throw new CustomError('User not found', 404)
    }

    targetUser.isSuspended = false
    targetUser.suspendedAt = null
    targetUser.suspensionReason = null
    await targetUser.save()

    return sanitizeUser(targetUser)
}
