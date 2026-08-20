import userModel from '../models/user.model'
import { IUser } from '../types/users.interface'

export default {
    findUserByEmail: (email: string, select: string = '') => {
        return userModel.findOne({ email }).select(select)
    },
    findUserById: (id: string) => {
        return userModel.findById(id)
    },
    findUserByConfirmationTokenAndCode: (token: string, code: string) => {
        return userModel.findOne({
            'accountConfimation.token': token,
            'accountConfimation.code': code
        })
    },
    findUserByGoogleId: (googleId: string, select: string = '') => {
        return userModel.findOne({ googleId }).select(select)
    },
    findUserByResetToken: (token: string, select: string = '') => {
        return userModel.findOne({ 'passwordReset.token': token }).select(select)
    },
    findUserByResetCodeAndEmail: (email: string, code: string, select: string = '') => {
        return userModel.findOne({
            email,
            'passwordReset.code': code
        }).select(select)
    },
    createUser: (payload: IUser) => {
        return userModel.create(payload)
    }
}
