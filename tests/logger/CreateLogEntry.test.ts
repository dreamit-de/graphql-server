/* eslint-disable max-len */
import { GraphQLError, Kind } from 'graphql'
import { createLogEntry } from 'src'
import { expect, test } from 'vitest'

// Created based upon implementation in node-fetch to avoid importing whole package for this class
class FetchError extends Error {
    name = 'FetchError'
    type: string
    constructor(message: string, type: string) {
        super(message)
        this.type = type
    }
}

const customerMessage = '`CustomerPayload` is an extension type'
const customerQuery = '{\n  customer {\n    dateOfBirth\n  }\n}'
const messageWithVariables =
    String.raw`Variable \"$login\" got invalid value` +
    String.raw` { email: \"max@mustermann.de\", password: \"12345678\", abc: \"def\" }` +
    String.raw`; Field \"abc\" is not defined by type LoginInput.`

const messageInvalidValue =
    String.raw`Variable \"$login\" got invalid value` +
    String.raw` { email: \"max@mustermann.de\", password: \"12345678\", abc: \"def\" }` +
    String.raw`; doesnotmatter.`

const messageField =
    String.raw`Variable \"$login\"` +
    String.raw` { email: \"max@mustermann.de\", password: \"12345678\", abc: \"def\" }` +
    String.raw`; Field \"abc\" is not defined by type LoginInput.`

const graphQLError: GraphQLError = new GraphQLError(customerMessage, {
    extensions: {
        exception: 'A stacktrace',
        query: customerQuery,
        serviceName: 'customer',
    },
})
const graphQLErrorWithVariables: GraphQLError = new GraphQLError(
    messageWithVariables,
    {
        extensions: {
            exception: 'A stacktrace',
            query: customerQuery,
            serviceName: 'myTestService',
        },
    },
)
const graphQLErrorWithSourceBody = new GraphQLError(customerMessage, {
    extensions: {
        exception: 'A stacktrace',
        serviceName: 'customer',
    },
    source: {
        get [Symbol.toStringTag](): string {
            return this[Symbol.toStringTag]
        },
        body: customerQuery,
        locationOffset: {
            column: 1,
            line: 1,
        },
        name: 'doesnotmatter',
    },
})

const graphQLErrorWithAstNode = new GraphQLError(customerMessage, {
    extensions: {
        exception: 'A stacktrace',
        serviceName: 'customer',
    },
    nodes: {
        kind: Kind.NAMED_TYPE,
        loc: undefined,
        name: {
            kind: Kind.NAME,
            value: 'customer',
        },
    },
})

const graphQLErrorWithSensibleStacktrace = new GraphQLError(customerMessage, {
    extensions: {
        exception: messageWithVariables,
        serviceName: 'customer',
    },
    nodes: {
        kind: Kind.NAMED_TYPE,
        loc: undefined,
        name: {
            kind: Kind.NAME,
            value: 'customer',
        },
    },
})

const errorWithSensibleStackInformation: Error = {
    message: customerMessage,
    name: 'SensibleError',
    stack: messageWithVariables,
}

const fetchError = new FetchError(
    'An error occurred while connecting to following endpoint',
    'system',
)

const errorWithoutStacktrace = new Error('error')
errorWithoutStacktrace.stack = undefined
const errorMessage = 'A GraphQLError message error'

const graphQLErrorMessage = 'A GraphQLError message ' + customerMessage
const fetchErrorMessage =
    'A FetchError message ' +
    'An error occurred while connecting to following endpoint'
const sanitizedMessage = String.raw`Variable \"$login\" got invalid value REMOVED BY SANITIZER; Field \"abc\" is not defined by type LoginInput.`
const errorWithVariables = 'A GraphQLError message ' + sanitizedMessage

test.each`
    logMessage                  | loglevel   | error                                 | expectedLogMessage     | expectedLogLevel | expectedStacktrace        | expectedQuery | expectedServiceName
    ${'A info message'}         | ${'INFO'}  | ${undefined}                          | ${'A info message'}    | ${'INFO'}        | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${messageWithVariables}     | ${'INFO'}  | ${undefined}                          | ${sanitizedMessage}    | ${'INFO'}        | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${messageInvalidValue}      | ${'INFO'}  | ${undefined}                          | ${messageInvalidValue} | ${'INFO'}        | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${messageField}             | ${'INFO'}  | ${undefined}                          | ${messageField}        | ${'INFO'}        | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${'A debug message'}        | ${'DEBUG'} | ${undefined}                          | ${'A debug message'}   | ${'DEBUG'}       | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${'A FetchError message'}   | ${'ERROR'} | ${fetchError}                         | ${fetchErrorMessage}   | ${'ERROR'}       | ${'FetchError: An error'} | ${undefined}  | ${'myTestService'}
    ${'A GraphQLError message'} | ${'ERROR'} | ${graphQLError}                       | ${graphQLErrorMessage} | ${'WARN'}        | ${'A stacktrace'}         | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${'ERROR'} | ${graphQLErrorWithVariables}          | ${errorWithVariables}  | ${'ERROR'}       | ${'A stacktrace'}         | ${'customer'} | ${'myTestService'}
    ${'A GraphQLError message'} | ${'ERROR'} | ${graphQLErrorWithSourceBody}         | ${graphQLErrorMessage} | ${'WARN'}        | ${'A stacktrace'}         | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${'ERROR'} | ${graphQLErrorWithAstNode}            | ${graphQLErrorMessage} | ${'WARN'}        | ${'A stacktrace'}         | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${'ERROR'} | ${graphQLErrorWithSensibleStacktrace} | ${graphQLErrorMessage} | ${'WARN'}        | ${sanitizedMessage}       | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${'ERROR'} | ${errorWithSensibleStackInformation}  | ${graphQLErrorMessage} | ${'ERROR'}       | ${sanitizedMessage}       | ${undefined}  | ${'myTestService'}
    ${'A GraphQLError message'} | ${'ERROR'} | ${errorWithoutStacktrace}             | ${errorMessage}        | ${'ERROR'}       | ${undefined}              | ${undefined}  | ${'myTestService'}
`(
    'expects a correct logEntry is created for given $logMessage , $loglevel and $error ',
    ({
        logMessage,
        loglevel,
        error,
        expectedLogMessage,
        expectedLogLevel,
        expectedStacktrace,
        expectedQuery,
        expectedServiceName,
    }) => {
        const logEntry = createLogEntry({
            context: undefined,
            error,
            logMessage,
            loggerName: 'test-logger',
            loglevel,
            serviceName: 'myTestService',
        })
        expect(logEntry.message).toBe(expectedLogMessage)
        expect(logEntry.level).toBe(expectedLogLevel)
        if (expectedStacktrace) {
            expect(logEntry.stacktrace).toEqual(
                expect.stringContaining(expectedStacktrace),
            )
        } else {
            expect(logEntry.stacktrace).toBe(expectedStacktrace)
        }

        if (expectedQuery) {
            expect(logEntry.query).toEqual(
                expect.stringContaining(expectedQuery),
            )
        } else {
            expect(logEntry.query).toBe(expectedQuery)
        }
        expect(logEntry.serviceName).toBe(expectedServiceName)
    },
)

test('Should use customErrorName instead or error.name if customErrorName is set', () => {
    const logEntry = createLogEntry({
        context: undefined,
        customErrorName: 'MyCustomError',
        error: graphQLError,
        logMessage: 'A GraphQLError message',
        loggerName: 'test-logger',
        loglevel: 'ERROR',
        serviceName: 'myTestService',
    })
    expect(logEntry.errorName).toBe('MyCustomError')
})

test(
    'Should use context.serviceName instead of error.extensions.serviceName' +
        ' if context contains serviceName',
    () => {
        const logEntry = createLogEntry({
            context: { serviceName: 'myRemoteService' },
            customErrorName: 'MyCustomError',
            error: errorWithSensibleStackInformation,
            logMessage: 'A GraphQLError message',
            loggerName: 'test-logger',
            loglevel: 'ERROR',
            serviceName: 'myTestService',
        })
        expect(logEntry.serviceName).toBe('myRemoteService')
    },
)

test('Should use fallback values for loggerName, serviceName and level if they are not set', () => {
    const logEntry = createLogEntry({
        context: undefined,
        logMessage: 'A GraphQLError message',
    })
    expect(logEntry.message).toBe('A GraphQLError message')
    expect(logEntry.level).toBe('INFO')
    expect(logEntry.logger).toBe('fallback-logger')
    expect(logEntry.serviceName).toBe('fallback-service')
})

test('Should remove white spaces at the beginning of the message', () => {
    const logEntry = createLogEntry({
        context: undefined,
        error: graphQLError,
        logMessage: '',
    })
    expect(logEntry.message).toBe(customerMessage)
})

test('Test downgrading loglevel based on service name', () => {
    expect(
        createLogEntry({
            context: { serviceName: 'myRemoteService' },
            error: errorWithoutStacktrace,
            logMessage: '',
            loglevel: 'ERROR',
            serviceName: 'myTestService',
        }).level,
    ).toBe('WARN')
    expect(
        createLogEntry({
            context: { serviceName: 'myTestService' },
            error: errorWithoutStacktrace,
            logMessage: '',
            loglevel: 'ERROR',
            serviceName: 'myTestService',
        }).level,
    ).toBe('ERROR')
    expect(
        createLogEntry({
            context: { serviceName: 'myTestService' },
            error: errorWithoutStacktrace,
            logMessage: '',
            loglevel: 'INFO',
            serviceName: 'myTestService',
        }).level,
    ).toBe('INFO')
    expect(
        createLogEntry({
            context: { serviceName: 'myRemoteService' },
            error: errorWithoutStacktrace,
            logMessage: '',
            loglevel: 'INFO',
            serviceName: 'myTestService',
        }).level,
    ).toBe('INFO')
})

test(
    'Should not downgrade error to warn if the service name' +
        'in error extensions and serviceName match',
    () => {
        const logEntry = createLogEntry({
            context: undefined,
            error: graphQLError,
            logMessage: '',
            loglevel: 'ERROR',
            serviceName: 'customer',
        })
        expect(logEntry.level).toBe('ERROR')
    },
)
