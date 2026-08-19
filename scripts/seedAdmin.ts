import dotenvFlow from 'dotenv-flow'
dotenvFlow.config()

import mongoose from 'mongoose'
import config from '../src/config/config'
import userModel from '../src/APIs/user/_shared/models/user.model'
import { EUserRoles } from '../src/constant/users'
import hashing from '../src/utils/hashing'

export const seedAdmin = async () => {
    const email = (process.env.ADMIN_SEED_EMAIL || 'admin@hirevia.com').toLowerCase().trim()
    const password = process.env.ADMIN_SEED_PASSWORD || 'AdminPass123!'

    if (!email || !password) {
        console.error('[SeedAdmin] ERROR: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be provided.')
        process.exit(1)
    }

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(config.DATABASE_URL as string)
        }

        const hashedPassword = await hashing.hashPassword(password)
        const existingUser = await userModel.findOne({ email })

        if (existingUser) {
            existingUser.role = EUserRoles.ADMIN
            existingUser.password = hashedPassword
            existingUser.accountConfimation.status = true
            existingUser.isSuspended = false
            await existingUser.save()
            console.log(`[SeedAdmin] Successfully updated admin user (${email}) with valid password.`)
            return existingUser
        }

        const adminUser = await userModel.create({
            name: 'Hirevia Administrator',
            email,
            phoneNumber: {
                isoCode: 'US',
                countryCode: '1',
                internationalNumber: '+12025550199'
            },
            timezone: 'UTC',
            password: hashedPassword,
            role: EUserRoles.ADMIN,
            accountConfimation: {
                status: true,
                token: 'seeded_admin_token',
                code: '000000',
                timestamp: new Date()
            },
            consent: true,
            isSuspended: false
        })

        console.log(`[SeedAdmin] Successfully created ADMIN user: ${email}`)
        return adminUser
    } catch (error) {
        console.error('[SeedAdmin] Failed to seed admin user:', error)
        throw error
    } finally {
        if (require.main === module && mongoose.connection.readyState !== 0) {
            await mongoose.disconnect()
        }
    }
}

if (require.main === module) {
    seedAdmin()
        .then(() => {
            process.exit(0)
        })
        .catch(() => {
            process.exit(1)
        })
}
