import path from 'path'
import resumeRepository from '../repo/resume.repository'
import StorageService from '../../../../services/storage'
import { IResume } from '../types/resume.interface'
import { CustomError } from '../../../../utils/errors'
import applicationModel from '../../../application/_shared/models/application.model'
import extractText from '../../../../utils/textExtractor'
import logger from '../../../../handlers/logger'

export const uploadResume = async (seekerId: string, file: Express.Multer.File) => {
    // Determine version number
    const latest = await resumeRepository.findLatestVersion(seekerId)
    const nextVersion = latest ? latest.version + 1 : 1

    // Store in storage
    const storageKey = await StorageService.upload(
        { buffer: file.buffer, originalname: file.originalname },
        'resumes'
    )

    try {
        const ext = path.extname(file.originalname).toLowerCase()

        let extractedText = ''
        try {
            extractedText = await extractText(file.buffer, ext)
        } catch (extractErr) {
            logger.warn('Text extraction during upload failed:', { meta: extractErr })
        }

        const fileData = file.buffer ? file.buffer.toString('base64') : ''

        const payload: IResume = {
            seekerId,
            originalFileName: file.originalname,
            storageKey,
            mimeType: file.mimetype,
            fileSize: file.size,
            fileExtension: ext,
            version: nextVersion,
            isActive: true,
            extractedText,
            fileData
        }

        const resume = await resumeRepository.create(payload)

        // Deactivate older resumes
        await resumeRepository.updateActiveState(seekerId, (resume as any)._id.toString(), false)

        return resume
    } catch (error) {
        // Cleanup storage file on db transaction failure
        await StorageService.delete(storageKey, 'resumes')
        throw error
    }
}

export const listResumes = async (seekerId: string) => {
    return resumeRepository.findBySeeker(seekerId)
}

export const getResume = async (seekerId: string, resumeId: string) => {
    const resume = await resumeRepository.findById(resumeId)
    if (!resume || resume.seekerId.toString() !== seekerId.toString()) {
        throw new CustomError('Resume not found', 404)
    }
    return resume
}

export const getResumeFile = async (seekerId: string, resumeId: string) => {
    const resume = await getResume(seekerId, resumeId)
    let fileBuffer: Buffer
    try {
        fileBuffer = await StorageService.get(resume.storageKey, 'resumes')
    } catch (storageErr) {
        if ((resume as any).fileData) {
            fileBuffer = Buffer.from((resume as any).fileData, 'base64')
        } else {
            throw storageErr
        }
    }

    return {
        fileBuffer,
        originalFileName: resume.originalFileName,
        mimeType: resume.mimeType
    }
}

export const deleteResume = async (seekerId: string, resumeId: string) => {
    const resume = await resumeRepository.findById(resumeId)
    if (!resume || resume.seekerId.toString() !== seekerId.toString()) {
        throw new CustomError('Resume not found', 404)
    }

    // Preserve historical integrity by rejecting deletion if referenced in any application
    const isReferenced = await applicationModel.findOne({ resumeId })
    if (isReferenced) {
        throw new CustomError('Cannot delete resume. It is referenced by an active job application.', 409)
    }

    // Safely promote another resume to active if the active one is deleted
    if (resume.isActive) {
        const resumes = await resumeRepository.findBySeeker(seekerId)
        const remaining = resumes.filter((r) => (r as any)._id.toString() !== resumeId)
        if (remaining.length > 0) {
            const latestRemaining = remaining[0] // sorted by version desc in repo query
            latestRemaining.isActive = true
            await latestRemaining.save()
        }
    }

    await resumeRepository.delete(resumeId)
    await StorageService.delete(resume.storageKey, 'resumes')

    return { success: true }
}
