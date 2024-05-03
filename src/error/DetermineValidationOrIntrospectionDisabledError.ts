import {
    INTROSPECTION_DISABLED_ERROR,
    VALIDATION_ERROR,
} from '@dreamit/graphql-server-base'

/**
 * Determines if an error is a ValidationError or
 * IntrospectionDisabledError using the information in the error message
 * @param {unknown} error - An error
 * @returns {string} INTROSPECTION_DISABLED_ERROR if error is an IntrospectionDisabledError,
 * ValidationError otherwise
 */
export function determineValidationOrIntrospectionDisabledError(
    error: unknown,
): string {
    return error instanceof Error &&
        ((error.message.includes('introspection') &&
            error.message.includes('disabled')) ||
            error.message.includes('__Directive'))
        ? INTROSPECTION_DISABLED_ERROR
        : VALIDATION_ERROR
}
