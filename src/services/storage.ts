import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import config from '../config/config'

const uploadDirRoot = path.resolve(config.UPLOAD_DIR || 'uploads')

export interface IStorageProvider {
    upload(file: { buffer: Buffer; originalname: string }, folder: string): Promise<string>
    get(storageKey: string, folder: string): Promise<Buffer>
    delete(storageKey: string, folder: string): Promise<void>
    exists(storageKey: string, folder: string): Promise<boolean>
}

class LocalStorageProvider implements IStorageProvider {
    async upload(file: { buffer: Buffer; originalname: string }, folder: string): Promise<string> {
        const ext = path.extname(file.originalname).toLowerCase()
        const storageKey = `${uuidv4()}${ext}`
        const destinationDir = path.join(uploadDirRoot, folder)

        // Ensure directories exist
        if (!fs.existsSync(destinationDir)) {
            fs.mkdirSync(destinationDir, { recursive: true })
        }

        const destinationPath = path.join(destinationDir, storageKey)
        await fs.promises.writeFile(destinationPath, file.buffer as unknown as Uint8Array)

        return storageKey
    }

    async get(storageKey: string, folder: string): Promise<Buffer> {
        const filePath = path.join(uploadDirRoot, folder, storageKey)
        if (!fs.existsSync(filePath)) {
            throw new Error('File not found in local storage')
        }
        return fs.promises.readFile(filePath)
    }

    async delete(storageKey: string, folder: string): Promise<void> {
        const filePath = path.join(uploadDirRoot, folder, storageKey)
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath)
        }
    }

    async exists(storageKey: string, folder: string): Promise<boolean> {
        const filePath = path.join(uploadDirRoot, folder, storageKey)
        try {
            await fs.promises.stat(filePath)
            return true
        } catch {
            return false
        }
    }
}

// Instantiate storage service with the local filesystem provider
export const StorageService: IStorageProvider = new LocalStorageProvider()
export default StorageService
