/* eslint-disable max-classes-per-file */
import type {
    GraphQLExecutionResult,
    GraphQLServerResponse,
    LogEntry,
    LogEntryInput,
    StandardSchemaV1,
} from '@dreamit/graphql-server-base'
import type { GraphQLServer, GraphQLServerOptions } from 'src'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import { JsonLogger, NoStacktraceJsonLogger } from 'src'

import { testDateString } from '@dreamit/funpara'
import { graphQLResponseSchema } from '@dreamit/graphql-std-schema'
import {
    JsonContentTypeHeader,
    NoConsole,
    NoOpTestLogger,
    userSchema,
    userSchemaResolvers,
} from '@dreamit/graphql-testing'
import type { IncomingHttpHeaders } from 'node:http'

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

const INITIAL_GRAPHQL_SERVER_OPTIONS: Partial<GraphQLServerOptions> = {
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
