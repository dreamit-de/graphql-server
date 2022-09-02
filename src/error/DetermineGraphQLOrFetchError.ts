import {
    FETCH_ERROR,
    GRAPHQL_ERROR
} from '..'

/**
 * Determines if an error is a GraphQLError or
 * FetchError using the information in the error message
 * @param {unknown} error - An error
 * @returns {string} FETCH_ERROR if error is a FetchError, GraphQLError otherwise
 */
export function determineGraphQLOrFetchError(error: unknown): string {
    return error instanceof Error && error.message && (error.message.includes(FETCH_ERROR)
        || error.message.includes('ECONNREFUSED')
        || error.message.includes('ECONNRESET')
        || error.message.includes('ETIMEDOUT')
        || error.message.includes('network timeout')
        || error.message.includes('invalid redirect URL')
        || error.message.includes('uri requested responds with a redirect'+
            ', redirect mode is set to error')
        || error.message.includes('maximum redirect reached')
        || error.message.includes('Cannot follow redirect')
        || error.message.includes('socket hang up')) ? FETCH_ERROR : GRAPHQL_ERROR
}
