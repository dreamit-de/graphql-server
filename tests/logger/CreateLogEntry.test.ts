/* eslint-disable max-len */
import {
    GraphQLError,
    Kind
} from 'graphql'
import {
    createLogEntry,
    LogLevel
} from '~/src'

// Created based upon implementation in node-fetch to avoid importing whole package for this class
class FetchError extends Error {
    name = 'FetchError'
    type: string
    constructor(message: string, type: string) {
        super(message)
        this.type = type
    }
}

const customerQuery = '{\n  customer {\n    dateOfBirth\n  }\n}'
const messageWithVariables = 'Variable \\"$login\\" got invalid value' +
    ' { email: \\"max@mustermann.de\\", password: \\"12345678\\", abc: \\"def\\" }' +
    '; Field \\"abc\\" is not defined by type LoginInput.'

const graphQLError: GraphQLError = new GraphQLError('`CustomerPayload` is an extension type', {
    extensions:  {exception: 'A stacktrace', query: customerQuery, serviceName: 'customer'}
})
const graphQLErrorWithVariables: GraphQLError = new GraphQLError(messageWithVariables, {extensions:  {exception: 'A stacktrace', query: customerQuery, serviceName: 'myTestService'}})
const graphQLErrorWithSourceBody = new GraphQLError('`CustomerPayload` is an extension type',{
    source: {
        get [Symbol.toStringTag](): string {
            return this[Symbol.toStringTag]
        },
        locationOffset: {line: 1, column: 1},
        name: 'doesnotmatter',
        body: customerQuery
    },
    extensions: {exception: 'A stacktrace', serviceName: 'customer'}
})

const graphQLErrorWithAstNode = new GraphQLError('`CustomerPayload` is an extension type', {
    nodes: {kind: Kind.NAMED_TYPE, loc: undefined, name: { kind: Kind.NAME, value: 'customer'}},
    extensions: {exception: 'A stacktrace', serviceName: 'customer'}
})

const graphQLErrorWithSensibleStacktrace = new GraphQLError('`CustomerPayload` is an extension type', {
    nodes: {kind: Kind.NAMED_TYPE, loc: undefined, name: { kind: Kind.NAME, value: 'customer'}},
    extensions: {exception: messageWithVariables, serviceName: 'customer'}
})

const errorWithSensibleStackInformation: Error = {name: 'SensibleError', message: '`CustomerPayload` is an extension type', stack: messageWithVariables }

const fetchError = new FetchError('An error occurred while connecting to following endpoint',
    'system')

const graphQLErrorMessage = 'A GraphQLError message `CustomerPayload` is an extension type'
const fetchErrorMessage = 'A FetchError message ' +
    'An error occurred while connecting to following endpoint'
const sanitizedMessage = 'Variable \\"$login\\" got invalid value REMOVED BY SANITIZER; Field \\"abc\\" is not defined by type LoginInput.'
const errorWithVariables = 'A GraphQLError message ' + sanitizedMessage


test.each`
    logMessage                  | loglevel          | error                                 | expectedLogMessage      | expectedLogLevel | expectedStacktrace        | expectedQuery | expectedServiceName
    ${'A info message'}         | ${LogLevel.info}  | ${undefined}                          | ${'A info message'}     | ${'INFO'}        | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${messageWithVariables}     | ${LogLevel.info}  | ${undefined}                          | ${sanitizedMessage}     | ${'INFO'}        | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${'A debug message'}        | ${LogLevel.debug} | ${undefined}                          | ${'A debug message'}    | ${'DEBUG'}       | ${undefined}              | ${undefined}  | ${'myTestService'}
    ${'A FetchError message'}   | ${LogLevel.error} | ${fetchError}                         | ${fetchErrorMessage}    | ${'ERROR'}       | ${'FetchError: An error'} | ${undefined}  | ${'myTestService'}
    ${'A GraphQLError message'} | ${LogLevel.error} | ${graphQLError}                       | ${graphQLErrorMessage}  | ${'WARN'}        | ${'A stacktrace'}         | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${LogLevel.error} | ${graphQLErrorWithVariables}          | ${errorWithVariables}   | ${'ERROR'}       | ${'A stacktrace'}         | ${'customer'} | ${'myTestService'}
    ${'A GraphQLError message'} | ${LogLevel.error} | ${graphQLErrorWithSourceBody}         | ${graphQLErrorMessage}  | ${'WARN'}        | ${'A stacktrace'}         | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${LogLevel.error} | ${graphQLErrorWithAstNode}            | ${graphQLErrorMessage}  | ${'WARN'}        | ${'A stacktrace'}         | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${LogLevel.error} | ${graphQLErrorWithSensibleStacktrace} | ${graphQLErrorMessage}  | ${'WARN'}        | ${sanitizedMessage}       | ${'customer'} | ${'customer'}
    ${'A GraphQLError message'} | ${LogLevel.error} | ${errorWithSensibleStackInformation}  | ${graphQLErrorMessage}  | ${'ERROR'}       | ${sanitizedMessage}       | ${undefined}  | ${'myTestService'}
`('expects a correct logEntry is created for given $logMessage , $loglevel and $error ', ({logMessage, loglevel, error, expectedLogMessage, expectedLogLevel, expectedStacktrace, expectedQuery, expectedServiceName}) => {
    const logEntry = createLogEntry(logMessage, loglevel, 'test-logger', 'myTestService', error)
    expect(logEntry.message).toBe(expectedLogMessage)
    expect(logEntry.level).toBe(expectedLogLevel)
    if (expectedStacktrace) {
        expect(logEntry.stacktrace).toEqual(expect.stringContaining(expectedStacktrace))
    } else {
        expect(logEntry.stacktrace).toBe(expectedStacktrace)
    }

    if (expectedQuery) {
        expect(logEntry.query).toEqual(expect.stringContaining(expectedQuery))
    } else {
        expect(logEntry.query).toBe(expectedQuery)
    }
    expect(logEntry.serviceName).toBe(expectedServiceName)
})

test('Should use customErrorName instead or error.name if customErrorName is set', () => {
    const logEntry = createLogEntry('A GraphQLError message',
        LogLevel.error,
        'test-logger',
        'myTestService',
        graphQLError,
        'MyCustomError')
    expect(logEntry.errorName).toBe('MyCustomError')
})

test('Should use context.serviceName instead of error.extensions.serviceName' +
    ' if context contains serviceName', () => {
    const logEntry = createLogEntry('A GraphQLError message',
        LogLevel.error,
        'test-logger',
        'myTestService',
        errorWithSensibleStackInformation,
        'MyCustomError',
        { serviceName: 'myRemoteService' })
    expect(logEntry.serviceName).toBe('myRemoteService')
})
