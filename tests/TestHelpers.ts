/* eslint-disable max-classes-per-file */
import {
    GraphQLExecutionResult,
    GraphQLServerResponse,
    LogEntry,
    LogEntryInput,
} from '@dreamit/graphql-server-base'
import {
    GraphQLServer,
    GraphQLServerOptions,
    JsonLogger,
    NoStacktraceJsonLogger,
    StandardSchemaV1,
} from 'src'

import { testDateString } from '@dreamit/funpara'
import { graphQLResponseSchema } from '@dreamit/graphql-std-schema'
import {
    JsonContentTypeHeader,
    NoConsole,
    NoOpTestLogger,
    userSchema,
    userSchemaResolvers,
} from '@dreamit/graphql-testing'
import { IncomingHttpHeaders } from 'node:http'

class JsonTestLogger extends JsonLogger {
    logEntries: LogEntry[] = new Array<LogEntry>()

    constructor(debugEnabled = false) {
        super(
            'test-logger',
            'myTestService',
            debugEnabled,
            undefined,
            undefined,
            NoConsole,
        )
    }

    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const logEntry = super.createLogEntry(logEntryInput)
        logEntry.stacktrace = logEntry.stacktrace ? 'stacktrace' : undefined
        logEntry.timestamp = testDateString
        this.logEntries.push(logEntry)
        return logEntry
    }
}

const LOGGER = new NoStacktraceJsonLogger(
    'nostack-logger',
    'myTestService',
    false,
)

const INITIAL_GRAPHQL_SERVER_OPTIONS: GraphQLServerOptions = {
    logger: NoOpTestLogger,
    responseStandardSchema: graphQLResponseSchema(),
    rootValue: userSchemaResolvers,
    schema: userSchema,
}

const PromiseReturningStandardSchema: StandardSchemaV1 = {
    '~standard': {
        validate: async () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        issues: [
                            {
                                message: 'Did not work!',
                            },
                        ],
                    })
                }, 100)
            })
        },
        vendor: 'test',
        version: 1,
    },
}

function sendRequest(
    graphqlServer: GraphQLServer,
    response: GraphQLServerResponse,
    body: BodyInit,
    method = 'POST',
    // eslint-disable-next-line unicorn/no-object-as-default-parameter
    headers: IncomingHttpHeaders = JsonContentTypeHeader,
): Promise<GraphQLExecutionResult> {
    return graphqlServer.handleRequest(
        {
            body: body,
            headers: headers,
            method: method,
        },
        response,
    )
}

function sendRequestWithURL(
    graphqlServer: GraphQLServer,
    response: GraphQLServerResponse,
    url: string,
    // eslint-disable-next-line unicorn/no-object-as-default-parameter
    headers: IncomingHttpHeaders = JsonContentTypeHeader,
): Promise<GraphQLExecutionResult> {
    return graphqlServer.handleRequest(
        {
            headers: headers,
            method: 'GET',
            url: url,
        },
        response,
    )
}

export {
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    JsonTestLogger,
    LOGGER,
    PromiseReturningStandardSchema,
    sendRequest,
    sendRequestWithURL,
}
