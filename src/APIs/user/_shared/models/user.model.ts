import mongoose from 'mongoose'
import { IUser } from '../types/users.interface'
import { EUserRoles } from '../../../../constant/users'

const userSchema = new mongoose.Schema<IUser>(
    {
        name: {
            type: String,
            minlength: 2,
            maxlength: 72,
            required: true
        },
        email: {
            type: String,
            unique: true,
            required: true
        },
        phoneNumber: {
            _id: false,
            isoCode: {
                type: String,
                required: false,
                default: 'US'
            },
            countryCode: {
                type: String,
                required: false,
                default: '1'
            },
            internationalNumber: {
                type: String,
                required: false,
                default: ''
            }
        },
        timezone: {
            type: String,
            default: 'UTC',
            required: true
        },
        password: {
            type: String,
            required: false,
            select: false
        },
        role: {
            type: String,
            default: EUserRoles.SEEKER,
            enum: EUserRoles,
            required: true
        },
        googleId: {
            type: String,
            default: null,
            sparse: true
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local'
        },
        profilePicture: {
            type: String,
            default: null
        },
        accountConfimation: {
            _id: false,
            status: {
                type: Boolean,
                default: false,
                required: true
            },
            token: {
                type: String,
                required: true
            },
            code: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                required: false
            }
        },
        passwordReset: {
            _id: false,
            token: {
                type: String,
                default: null
            },
            code: {
                type: String,
                default: null
            },
            expiry: {
                type: Number,
                default: null
            },
            lastResetAt: {
                type: Date,
                default: null
            }
        },
        lastLoginAt: {
            type: Date,
            default: null
        },
        consent: {
            type: Boolean,
            required: true
        },
        isSuspended: {
            type: Boolean,
            default: false
        },
        suspendedAt: {
            type: Date,
            default: null
        },
        suspensionReason: {
            type: String,
            default: null
        },
        subscriptionStatus: {
            type: String,
            enum: ['UNPAID', 'PAID'],
            default: 'UNPAID'
        },
        subscriptionPaidAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
)

export default mongoose.model<IUser>('User', userSchema)
