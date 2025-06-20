/* eslint-disable max-len */
import { extractResponseFormatFromAcceptHeader } from 'src'
import { describe, expect, test } from 'vitest'

describe('Test that response format is extracted correctly from accept header', () => {
    test.each`
        acceptHeader                                                   | returnJsonAsFallback | expectedResponseFormat
        ${undefined}                                                   | ${true}              | ${'JSON'}
        ${undefined}                                                   | ${false}             | ${'UNSUPPORTED'}
        ${undefined}                                                   | ${undefined}         | ${'JSON'}
        ${'somethingStrange'}                                          | ${true}              | ${'JSON'}
        ${'somethingStrange'}                                          | ${false}             | ${'UNSUPPORTED'}
        ${'application/graphql-response+json'}                         | ${true}              | ${'GRAPHQL-RESPONSE'}
        ${'application/graphql-response+json'}                         | ${false}             | ${'GRAPHQL-RESPONSE'}
        ${'application/graphql-response+json, application/json;q=0.9'} | ${true}              | ${'GRAPHQL-RESPONSE'}
        ${'application/graphql-response+json, application/json;q=0.9'} | ${false}             | ${'GRAPHQL-RESPONSE'}
        ${'application/json'}                                          | ${true}              | ${'JSON'}
        ${'application/json'}                                          | ${false}             | ${'JSON'}
        ${'application/json, application/graphql-response+json;q=0.9'} | ${true}              | ${'JSON'}
        ${'application/json, application/graphql-response+json;q=0.9'} | ${false}             | ${'JSON'}
    `(
        'expects for accept header $acceptHeader to extract values correctly',
        ({ acceptHeader, returnJsonAsFallback, expectedResponseFormat }) => {
            expect(
                extractResponseFormatFromAcceptHeader(
                    acceptHeader,
                    returnJsonAsFallback,
                ),
            ).toBe(expectedResponseFormat)
        },
    )
})
