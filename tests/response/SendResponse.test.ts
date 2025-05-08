import {
    NoOpTestLogger,
    StandaloneGraphQLServerResponse,
    StandaloneGraphQLServerResponseCompat,
} from '@dreamit/graphql-testing'
import { fc, test as propertyTest } from '@fast-check/vitest'
import { GraphQLError, GraphQLFormattedError } from 'graphql'
import {
    defaultResponseEndChunkFunction,
    noOpStandardSchema,
    sendResponse,
} from 'src'
import {
    JsonTestLogger,
    PromiseReturningStandardSchema,
} from 'tests/TestHelpers'
import { expect, test } from 'vitest'

test.each([
    new StandaloneGraphQLServerResponseCompat(),
    new StandaloneGraphQLServerResponse(),
])(
    'Should use default response.end behavior if no responseEndChunkFunction if defined',
    (response: StandaloneGraphQLServerResponseCompat) => {
        sendResponse({
            context: {},
            executionResult: {
                data: { message: 'Did work!' },
            },
            formatErrorFunction: function testFormatErrorFunction(
                error: GraphQLError,
            ): GraphQLFormattedError {
                return error
            },
            logger: NoOpTestLogger,
            response: response,
            responseEndChunkFunction: defaultResponseEndChunkFunction,
            responseStandardSchema: noOpStandardSchema,
        })

        const lastResponse = response.getLastResponseAsObject()
        expect(lastResponse.data.message).toStrictEqual('Did work!')
        expect(response.statusCode).toBe(400)
        expect(response.headers.get('content-type')).toBe(
            'application/json; charset=utf-8',
        )
    },
)

test.each([
    new StandaloneGraphQLServerResponseCompat(),
    new StandaloneGraphQLServerResponse(),
])(
    'Should send original response if responseStandardSchema returns a Promise',
    (response: StandaloneGraphQLServerResponseCompat) => {
        sendResponse({
            context: {},
            customHeaders: {
                'X-Custom-Header': 'CustomValue',
            },
            executionResult: {
                data: { message: 'Did work!' },
            },
            formatErrorFunction: function testFormatErrorFunction(
                error: GraphQLError,
            ): GraphQLFormattedError {
                return error
            },
            logger: NoOpTestLogger,
            response: response,
            responseEndChunkFunction: defaultResponseEndChunkFunction,
            responseStandardSchema: PromiseReturningStandardSchema,
            statusCode: 401,
        })

        const lastResponse = response.getLastResponseAsObject()
        expect(lastResponse.data.message).toStrictEqual('Did work!')
        expect(response.statusCode).toBe(401)
        expect(response.headers.get('content-type')).toBe(
            'application/json; charset=utf-8',
        )
        expect(response.headers.get('x-custom-header')).toBe('CustomValue')
    },
)

test('Should log errors if ServerResponse or StandardSchema have no correct implementation', () => {
    const logger = new JsonTestLogger(false)
    sendResponse({
        context: {},
        customHeaders: {
            'X-Custom-Header': 'CustomValue',
        },
        executionResult: {
            data: { message: 'Did work!' },
        },
        formatErrorFunction: function testFormatErrorFunction(
            error: GraphQLError,
        ): GraphQLFormattedError {
            return error
        },
        logger: logger,
        response: {
            removeHeader: (): void => {
                throw new Error('Function not implemented.')
            },
            statusCode: 401,
        },
        responseEndChunkFunction: defaultResponseEndChunkFunction,
        responseStandardSchema: {
            '~standard': {
                validate: () => {
                    throw new Error('StandardSchema not implemented')
                },
                vendor: 'test',
                version: 1,
            },
        },
        statusCode: 401,
    })

    let logEntry = logger.logEntries.at(0)
    expect(logEntry?.message).toBe(
        'An error occurred while validating the response: StandardSchema not implemented',
    )
    expect(logEntry?.errorName).toBe('ResponseValidationError')

    logEntry = logger.logEntries.at(1)
    expect(logEntry?.message).toBe(
        'Cannot set content-type header because neither setHeader nor header function is available: MissingHeaderFunction',
    )
    expect(logEntry?.errorName).toBe('MissingHeaderFunctionError')

    logEntry = logger.logEntries.at(2)
    expect(logEntry?.message).toBe(
        'Cannot set custom header because neither setHeader nor header function is available: MissingHeaderFunction',
    )
    expect(logEntry?.errorName).toBe('MissingHeaderFunctionError')

    logEntry = logger.logEntries.at(3)
    expect(logEntry?.message).toBe(
        'Cannot send response because neither end nor send function is available: MissingSendFunction',
    )
    expect(logEntry?.errorName).toBe('MissingSendFunctionError')
})

test.each([
    new StandaloneGraphQLServerResponseCompat(),
    new StandaloneGraphQLServerResponse(),
])(
    'Should send response validation error if any exist',
    (response: StandaloneGraphQLServerResponseCompat) => {
        sendResponse({
            context: {},
            executionResult: {
                data: { message: 'Did work!' },
            },
            formatErrorFunction: function testFormatErrorFunction(
                error: GraphQLError,
            ): GraphQLFormattedError {
                return error
            },
            logger: NoOpTestLogger,
            response: response,
            responseEndChunkFunction: defaultResponseEndChunkFunction,
            responseStandardSchema: {
                '~standard': {
                    validate: () => {
                        return {
                            issues: [
                                {
                                    message: 'Validation failed!',
                                },
                            ],
                        }
                    },
                    vendor: 'test',
                    version: 1,
                },
            },
            statusCode: 401,
        })

        const lastResponse = response.getLastResponseAsObject()
        expect(lastResponse.errors[0].message).toStrictEqual(
            'Validation failed!',
        )
        expect(response.statusCode).toBe(401)
        expect(response.headers.get('content-type')).toBe(
            'application/json; charset=utf-8',
        )
    },
)

// This tests the same as the first test, we need the original test for the coverage as it does not yet work with property tests
propertyTest.prop([fc.string()])(
    'Should use default response.end behavior if no responseEndChunkFunction if defined and return expected message',
    (messageToTest) => {
        const standaloneGraphQLServerResponse =
            new StandaloneGraphQLServerResponse()
        sendResponse({
            context: {},
            executionResult: {
                data: { message: messageToTest },
            },
            formatErrorFunction: function testFormatErrorFunction(
                error: GraphQLError,
            ): GraphQLFormattedError {
                return error
            },
            logger: NoOpTestLogger,
            response: standaloneGraphQLServerResponse,
            responseEndChunkFunction: defaultResponseEndChunkFunction,
            responseStandardSchema: noOpStandardSchema,
            statusCode: 200,
        })

        const lastResponse =
            standaloneGraphQLServerResponse.getLastResponseAsObject()

        return (
            lastResponse.data.message === messageToTest &&
            standaloneGraphQLServerResponse.statusCode === 200 &&
            standaloneGraphQLServerResponse.headers.get('content-type') ===
                'application/json; charset=utf-8'
        )
    },
)
