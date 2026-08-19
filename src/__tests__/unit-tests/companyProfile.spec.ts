import { createCompanyProfile, getProfileByUserId, updateCompanyProfile } from '../../APIs/company/profile/companyProfile.service'
import companyProfileRepository from '../../APIs/company/_shared/repo/companyProfile.repository'
import { CustomError } from '../../utils/errors'
import { ICompanyProfile } from '../../APIs/company/_shared/types/companyProfile.interface'

jest.mock('../../APIs/company/_shared/repo/companyProfile.repository')

describe('Company Profile Service', () => {
    const mockUserId = 'user123'
    const mockProfile: ICompanyProfile = {
        userId: mockUserId,
        companyName: 'Tech Corp',
        description: 'Innovating tech',
        website: 'https://techcorp.com',
        industry: 'Software',
        location: 'San Francisco, CA',
        phone: '+1234567890',
        logoUrl: 'https://techcorp.com/logo.png'
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getProfileByUserId', () => {
        it('should return company profile if it exists', async () => {
            ;(companyProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile)

            const result = await getProfileByUserId(mockUserId)
            expect(result).toEqual(mockProfile)
            expect(companyProfileRepository.findByUserId).toHaveBeenCalledWith(mockUserId)
        })

        it('should throw 404 CustomError if profile does not exist', async () => {
            ;(companyProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null)

            await expect(getProfileByUserId(mockUserId)).rejects.toThrow(
                new CustomError('Company profile not found', 404)
            )
        })
    })

    describe('createCompanyProfile', () => {
        it('should create a new company profile if none exists', async () => {
            ;(companyProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null)
            ;(companyProfileRepository.createProfile as jest.Mock).mockResolvedValue(mockProfile)

            const result = await createCompanyProfile(mockUserId, mockProfile)
            expect(result).toEqual(mockProfile)
            expect(companyProfileRepository.createProfile).toHaveBeenCalledWith({
                ...mockProfile,
                userId: mockUserId
            })
        })

        it('should throw 409 CustomError if profile already exists', async () => {
            ;(companyProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile)

            await expect(createCompanyProfile(mockUserId, mockProfile)).rejects.toThrow(
                new CustomError('Company profile already exists', 409)
            )
        })
    })

    describe('updateCompanyProfile', () => {
        it('should update the company profile if it exists', async () => {
            ;(companyProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile)
            ;(companyProfileRepository.updateProfile as jest.Mock).mockResolvedValue({
                ...mockProfile,
                companyName: 'Tech Corp New'
            })

            const updateData = { companyName: 'Tech Corp New', userId: 'maliciousUserOverride' }
            const result = await updateCompanyProfile(mockUserId, updateData)

            expect(result).toEqual({ ...mockProfile, companyName: 'Tech Corp New' })
            // Verify that userId parameter was stripped out of update payload to enforce ownership boundaries
            expect(companyProfileRepository.updateProfile).toHaveBeenCalledWith(mockUserId, {
                companyName: 'Tech Corp New'
            })
        })

        it('should throw 404 CustomError if profile does not exist', async () => {
            ;(companyProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null)

            await expect(updateCompanyProfile(mockUserId, { companyName: 'New name' })).rejects.toThrow(
                new CustomError('Company profile not found', 404)
            )
        })
    })
})
