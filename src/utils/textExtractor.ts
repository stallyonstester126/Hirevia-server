import mammoth from 'mammoth'
import { CustomError } from './errors'
import { PDFParse } from 'pdf-parse'

/**
 * Extracts raw text content from a file buffer based on the file extension.
 * @param buffer - File content buffer
 * @param fileExtension - Lowercase file extension (e.g. '.pdf', '.docx')
 */
export const extractText = async (buffer: Buffer, fileExtension: string): Promise<string> => {
    const ext = fileExtension.toLowerCase()

    if (ext === '.pdf') {
        try {
            const parser = new PDFParse({ data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) })
            const data = await parser.getText()
            return data.text || ''
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new CustomError(`Failed to parse PDF document: ${message}`, 400)
        }
    } else if (ext === '.docx') {
        try {
            const data = await mammoth.extractRawText({ buffer })
            return data.value || ''
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new CustomError(`Failed to parse DOCX document: ${message}`, 400)
        }
    } else {
        throw new CustomError(`Text extraction not supported for extension '${fileExtension}'`, 400)
    }
}

export default extractText
