/* eslint-disable unicorn/error-message */
import { FETCH_ERROR, GRAPHQL_ERROR } from '@dreamit/graphql-server-base'
import { determineGraphQLOrFetchError } from 'src'
import { expect, test } from 'vitest'

const redirectedErrorMessage =
    'uri requested responds with a redirect, redirect mode is set to error'

test.each`
    errorMessage                  | expectedErrorName
    ${'ECONNREFUSED'}             | ${FETCH_ERROR}
    ${'ECONNRESET'}               | ${FETCH_ERROR}
    ${'EPERM'}                    | ${FETCH_ERROR}
    ${'ETIMEDOUT'}                | ${FETCH_ERROR}
    ${'network timeout'}          | ${FETCH_ERROR}
    ${'invalid redirect URL'}     | ${FETCH_ERROR}
    ${redirectedErrorMessage}     | ${FETCH_ERROR}
    ${'maximum redirect reached'} | ${FETCH_ERROR}
    ${'Cannot follow redirect'}   | ${FETCH_ERROR}
    ${'socket hang up'}           | ${FETCH_ERROR}
    ${'fetch failed'}             | ${FETCH_ERROR}
    ${'I am a GraphQLError'}      | ${GRAPHQL_ERROR}
`(
    'Correctly determine if error $errorMessage is a GraphQLError or FetchError $expectedErrorName',
    ({ errorMessage, expectedErrorName }) => {
        expect(determineGraphQLOrFetchError(new Error(errorMessage))).toBe(
            expectedErrorName,
        )
    },
)
