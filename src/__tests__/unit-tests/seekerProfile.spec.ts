import { createSeekerProfile, getProfileByUserId, updateSeekerProfile } from '../../APIs/seeker/profile/seekerProfile.service'
import seekerProfileRepository from '../../APIs/seeker/_shared/repo/seekerProfile.repository'
import { CustomError } from '../../utils/errors'
import { ISeekerProfile } from '../../APIs/seeker/_shared/types/seekerProfile.interface'

jest.mock('../../APIs/seeker/_shared/repo/seekerProfile.repository')

describe('Seeker Profile Service', () => {
    const mockUserId = 'user789'
    const mockProfile: ISeekerProfile = {
        userId: mockUserId,
        headline: 'Full Stack Engineer',
        bio: 'Coding enthusiast',
        location: 'New York, NY',
        skills: ['Node.js', 'TypeScript', 'React'],
        experience: [
            {
                company: 'Innovate LLC',
                position: 'Software Engineer',
                startDate: '2023-01-01',
                endDate: '2025-01-01',
                description: 'Build APIs'
            }
        ],
        education: [
            {
                institution: 'State University',
                degree: 'B.S. in CS',
                startDate: '2019-09-01',
                endDate: '2023-05-01'
            }
        ]
    }

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('getProfileByUserId', () => {
        it('should return seeker profile if it exists', async () => {
            ;(seekerProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile)

            const result = await getProfileByUserId(mockUserId)
            expect(result).toEqual(mockProfile)
            expect(seekerProfileRepository.findByUserId).toHaveBeenCalledWith(mockUserId)
        })

        it('should throw 404 CustomError if profile does not exist', async () => {
            ;(seekerProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null)

            await expect(getProfileByUserId(mockUserId)).rejects.toThrow(
                new CustomError('Seeker profile not found', 404)
            )
        })
    })

    describe('createSeekerProfile', () => {
        it('should create a new seeker profile if none exists', async () => {
            ;(seekerProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null)
            ;(seekerProfileRepository.createProfile as jest.Mock).mockResolvedValue(mockProfile)

            const result = await createSeekerProfile(mockUserId, mockProfile)
            expect(result).toEqual(mockProfile)
            expect(seekerProfileRepository.createProfile).toHaveBeenCalledWith({
                ...mockProfile,
                userId: mockUserId
            })
        })

        it('should throw 409 CustomError if profile already exists', async () => {
            ;(seekerProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile)

            await expect(createSeekerProfile(mockUserId, mockProfile)).rejects.toThrow(
                new CustomError('Seeker profile already exists', 409)
            )
        })
    })

    describe('updateSeekerProfile', () => {
        it('should update the seeker profile if it exists', async () => {
            ;(seekerProfileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfile)
            ;(seekerProfileRepository.updateProfile as jest.Mock).mockResolvedValue({
                ...mockProfile,
                headline: 'Lead Developer'
            })

            const updateData = { headline: 'Lead Developer', userId: 'maliciousUserOverride' }
            const result = await updateSeekerProfile(mockUserId, updateData)

            expect(result).toEqual({ ...mockProfile, headline: 'Lead Developer' })
            // Verify that userId parameter was stripped out of update payload to enforce ownership boundaries
            expect(seekerProfileRepository.updateProfile).toHaveBeenCalledWith(mockUserId, {
                headline: 'Lead Developer'
            })
        })

        it('should throw 404 CustomError if profile does not exist', async () => {
            ;(seekerProfileRepository.findByUserId as jest.Mock).mockResolvedValue(null)

            await expect(updateSeekerProfile(mockUserId, { headline: 'New headline' })).rejects.toThrow(
                new CustomError('Seeker profile not found', 404)
            )
        })
    })
})
