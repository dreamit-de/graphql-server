import type { ResponseFormat } from './ResponseFormat'

/**
 * Extracts the response format from the Accept header.
 *
 * @param acceptHeader - The value of the Accept header from the request.
 * @param returnJsonAsFallback - If true, returns 'JSON' as a fallback if no specific format is found. Otherwise unsupported formats will return 'UNSUPPORTED' is returned
 * @returns The determined response format.
 */
export function extractResponseFormatFromAcceptHeader(
    acceptHeader: string | undefined,
    returnJsonAsFallback = true,
): ResponseFormat {
    if (!acceptHeader) {
        return returnJsonAsFallback ? 'JSON' : 'UNSUPPORTED'
    }

    const acceptHeaderLower = acceptHeader.toLowerCase()
    if (
        acceptHeaderLower.includes('application/graphql-response+json') &&
        !acceptHeaderLower.includes('application/graphql-response+json;q=')
    ) {
        return 'GRAPHQL-RESPONSE'
    } else if (acceptHeaderLower.includes('application/json')) {
        return 'JSON'
    } else {
        return returnJsonAsFallback ? 'JSON' : 'UNSUPPORTED'
    }
}
