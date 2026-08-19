"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmin = void 0;
const dotenv_flow_1 = __importDefault(require("dotenv-flow"));
dotenv_flow_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../src/config/config"));
const user_model_1 = __importDefault(require("../src/APIs/user/_shared/models/user.model"));
const users_1 = require("../src/constant/users");
const hashing_1 = __importDefault(require("../src/utils/hashing"));
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    const email = (process.env.ADMIN_SEED_EMAIL || 'admin@hirevia.com').toLowerCase().trim();
    const password = process.env.ADMIN_SEED_PASSWORD || 'AdminPassword123!';
    if (!email || !password) {
        console.error('[SeedAdmin] ERROR: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be provided.');
        process.exit(1);
    }
    try {
        if (mongoose_1.default.connection.readyState === 0) {
            yield mongoose_1.default.connect(config_1.default.DATABASE_URL);
        }
        const existingUser = yield user_model_1.default.findOne({ email });
        if (existingUser) {
            if (existingUser.role === users_1.EUserRoles.ADMIN) {
                console.log(`[SeedAdmin] Admin user (${email}) already exists. Idempotent skip.`);
                return existingUser;
            }
            else {
                console.warn(`[SeedAdmin] User with email (${email}) exists with role: ${existingUser.role}. Updating role to ADMIN.`);
                existingUser.role = users_1.EUserRoles.ADMIN;
                existingUser.accountConfimation.status = true;
                yield existingUser.save();
                console.log(`[SeedAdmin] Successfully updated user (${email}) to ADMIN.`);
                return existingUser;
            }
        }
        const hashedPassword = yield hashing_1.default.hashPassword(password);
        const adminUser = yield user_model_1.default.create({
            name: 'Hirevia Administrator',
            email,
            phoneNumber: {
                isoCode: 'US',
                countryCode: '1',
                internationalNumber: '+12025550199'
            },
            timezone: 'UTC',
            password: hashedPassword,
            role: users_1.EUserRoles.ADMIN,
            accountConfimation: {
                status: true,
                token: 'seeded_admin_token',
                code: '000000',
                timestamp: new Date()
            },
            consent: true,
            isSuspended: false
        });
        console.log(`[SeedAdmin] Successfully created ADMIN user: ${email}`);
        return adminUser;
    }
    catch (error) {
        console.error('[SeedAdmin] Failed to seed admin user:', error);
        throw error;
    }
    finally {
        if (require.main === module && mongoose_1.default.connection.readyState !== 0) {
            yield mongoose_1.default.disconnect();
        }
    }
});
exports.seedAdmin = seedAdmin;
if (require.main === module) {
    (0, exports.seedAdmin)()
        .then(() => {
        process.exit(0);
    })
        .catch(() => {
        process.exit(1);
    });
}
//# sourceMappingURL=seedAdmin.js.map