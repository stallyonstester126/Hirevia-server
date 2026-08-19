import { uploadResume, listResumes, getResume, getResumeFile, deleteResume } from '../../APIs/seeker/_shared/services/resume.service'
import resumeRepository from '../../APIs/seeker/_shared/repo/resume.repository'
import StorageService from '../../services/storage'
import applicationModel from '../../APIs/application/_shared/models/application.model'
import { CustomError } from '../../utils/errors'
import { IResume } from '../../APIs/seeker/_shared/types/resume.interface'

jest.mock('../../APIs/seeker/_shared/repo/resume.repository')
jest.mock('../../services/storage')
jest.mock('../../APIs/application/_shared/models/application.model')

describe('Resume Service', () => {
    const mockSeekerId = 'seeker123'
    const mockResumeId = 'resume999'
    const mockStorageKey = 'uuid-key.pdf'
    
    const mockResume: IResume = {
        seekerId: mockSeekerId,
        originalFileName: 'cv.pdf',
        storageKey: mockStorageKey,
        mimeType: 'application/pdf',
        fileSize: 500,
        fileExtension: '.pdf',
        version: 1,
        isActive: true
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('uploadResume', () => {
        it('should upload first resume version, save to local storage and database', async () => {
            ;(resumeRepository.findLatestVersion as jest.Mock).mockResolvedValue(null)
            ;(StorageService.upload as jest.Mock).mockResolvedValue(mockStorageKey)
            ;(resumeRepository.create as jest.Mock).mockResolvedValue({
                ...mockResume,
                _id: mockResumeId
            })

            const mockFile = {
                buffer: Buffer.from('PDF_CONTENT'),
                originalname: 'cv.pdf',
                mimetype: 'application/pdf',
                size: 500
            } as Express.Multer.File

            const result = await uploadResume(mockSeekerId, mockFile)
            expect(result.version).toBe(1)
            expect(result.isActive).toBe(true)
            expect(StorageService.upload).toHaveBeenCalledWith(
                { buffer: mockFile.buffer, originalname: mockFile.originalname },
                'resumes'
            )
            expect(resumeRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    seekerId: mockSeekerId,
                    version: 1,
                    isActive: true
                })
            )
            expect(resumeRepository.updateActiveState).toHaveBeenCalledWith(mockSeekerId, mockResumeId, false)
        })

        it('should increment version for subsequent uploads', async () => {
            ;(resumeRepository.findLatestVersion as jest.Mock).mockResolvedValue(mockResume)
            ;(StorageService.upload as jest.Mock).mockResolvedValue('uuid-key-2.pdf')
            ;(resumeRepository.create as jest.Mock).mockResolvedValue({
                ...mockResume,
                version: 2,
                _id: 'resume2'
            })

            const mockFile = {
                buffer: Buffer.from('PDF_CONTENT'),
                originalname: 'cv.pdf',
                mimetype: 'application/pdf',
                size: 500
            } as Express.Multer.File

            const result = await uploadResume(mockSeekerId, mockFile)
            expect(result.version).toBe(2)
            expect(resumeRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    version: 2
                })
            )
        })
    })

    describe('listResumes', () => {
        it('should list all resumes owned by the seeker', async () => {
            ;(resumeRepository.findBySeeker as jest.Mock).mockResolvedValue([mockResume])

            const result = await listResumes(mockSeekerId)
            expect(result).toEqual([mockResume])
            expect(resumeRepository.findBySeeker).toHaveBeenCalledWith(mockSeekerId)
        })
    })

    describe('getResume', () => {
        it('should retrieve a resume by ID if owned by seeker', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)

            const result = await getResume(mockSeekerId, mockResumeId)
            expect(result).toEqual(mockResume)
        })

        it('should throw 404 CustomError if resume does not belong to seeker', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue({
                ...mockResume,
                seekerId: 'anotherSeeker'
            })

            await expect(getResume(mockSeekerId, mockResumeId)).rejects.toThrow(
                new CustomError('Resume not found', 404)
            )
        })
    })

    describe('getResumeFile', () => {
        it('should retrieve resume details and file buffer from storage', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(StorageService.get as jest.Mock).mockResolvedValue(Buffer.from('PDF_CONTENT'))

            const result = await getResumeFile(mockSeekerId, mockResumeId)
            expect(result.originalFileName).toBe('cv.pdf')
            expect(result.mimeType).toBe('application/pdf')
            expect(result.fileBuffer.toString()).toBe('PDF_CONTENT')
        })
    })

    describe('deleteResume', () => {
        it('should throw 409 CustomError if resume is referenced by any application', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue(mockResume)
            ;(applicationModel.findOne as jest.Mock).mockResolvedValue({ _id: 'app1' })

            await expect(deleteResume(mockSeekerId, mockResumeId)).rejects.toThrow(
                new CustomError('Cannot delete resume. It is referenced by an active job application.', 409)
            )
        })

        it('should delete and promote next version to active if active resume is deleted', async () => {
            ;(resumeRepository.findById as jest.Mock).mockResolvedValue({
                ...mockResume,
                _id: mockResumeId,
                isActive: true
            })
            ;(applicationModel.findOne as jest.Mock).mockResolvedValue(null)

            const mockSave = jest.fn()
            const olderResume = {
                ...mockResume,
                _id: 'olderResumeId',
                version: 1,
                isActive: false,
                save: mockSave
            }
            ;(resumeRepository.findBySeeker as jest.Mock).mockResolvedValue([
                { ...mockResume, _id: mockResumeId, version: 2 },
                olderResume
            ])

            const result = await deleteResume(mockSeekerId, mockResumeId)
            expect(result).toEqual({ success: true })
            expect(mockSave).toHaveBeenCalled()
            expect(olderResume.isActive).toBe(true)
            expect(resumeRepository.delete).toHaveBeenCalledWith(mockResumeId)
            expect(StorageService.delete).toHaveBeenCalledWith(mockStorageKey, 'resumes')
        })
    })
})
