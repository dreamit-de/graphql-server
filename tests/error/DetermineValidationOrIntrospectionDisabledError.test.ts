/* eslint-disable unicorn/error-message */
import { determineValidationOrIntrospectionDisabledError } from '@/index'
import {
    INTROSPECTION_DISABLED_ERROR,
    VALIDATION_ERROR,
} from '@dreamit/graphql-server-base'
import { expect, test } from 'vitest'

const introspectionDisabledMessage = 'GraphQL introspection is disabled'
const unknownDirectiveMessage = 'Unknown directive "__Directive"'
const validationErrorMessage = 'I am a Validation error'

test.each`
    error                                      | expectedErrorType
    ${new Error(introspectionDisabledMessage)} | ${INTROSPECTION_DISABLED_ERROR}
    ${new Error(unknownDirectiveMessage)}      | ${INTROSPECTION_DISABLED_ERROR}
    ${new Error(validationErrorMessage)}       | ${VALIDATION_ERROR}
    ${new Error('')}                           | ${VALIDATION_ERROR}
    ${new Error('introspection')}              | ${VALIDATION_ERROR}
    ${new Error('disabled')}                   | ${VALIDATION_ERROR}
    ${'String and not an Error!'}              | ${VALIDATION_ERROR}
`(
    'Correctly determine if error $error is a validation or an introspection error $truncateLimit',
    ({ error, expectedErrorType }) => {
        expect(determineValidationOrIntrospectionDisabledError(error)).toBe(
            expectedErrorType,
        )
    },
)
