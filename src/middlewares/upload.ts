import multer from 'multer'
import path from 'path'
import { Request, Response, NextFunction } from 'express'
import config from '../config/config'
import httpError from '../handlers/errorHandler/httpError'
import { CustomError } from '../utils/errors'

const allowedExtensions = ['.pdf', '.doc', '.docx']
const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const storage = multer.memoryStorage()

const upload = multer({
    storage,
    limits: {
        fileSize: config.MAX_FILE_SIZE
    },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        const mime = file.mimetype

        if (!allowedExtensions.includes(ext)) {
            return cb(new CustomError('Invalid file extension. Only PDF, DOC, and DOCX are allowed.', 400))
        }

        if (!allowedMimeTypes.includes(mime)) {
            return cb(new CustomError('Invalid MIME type. Only PDF, DOC, and DOCX are allowed.', 400))
        }

        // Check inconsistent combinations
        if (ext === '.pdf' && mime !== 'application/pdf') {
            return cb(new CustomError('MIME type does not match file extension.', 400))
        }

        if (ext === '.doc' && mime !== 'application/msword') {
            return cb(new CustomError('MIME type does not match file extension.', 400))
        }

        if (ext === '.docx' && mime !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return cb(new CustomError('MIME type does not match file extension.', 400))
        }

        cb(null, true)
    }
}).single('file')

export const uploadResumeMiddleware = (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return httpError(next, new CustomError('File exceeds max size limit of 10MB', 400), req, 400)
            }
            return httpError(next, new CustomError(err.message, 400), req, 400)
        } else if (err) {
            const statusCode = err instanceof CustomError ? err.statusCode : 400
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            return httpError(next, errorInstance, req, statusCode)
        }

        if (!req.file) {
            return httpError(next, new CustomError('No file uploaded', 400), req, 400)
        }

        next()
    })
}
export default uploadResumeMiddleware
