/* eslint-disable max-classes-per-file */
import {
    GraphQLExecutionResult,
    GraphQLServerResponse,
} from '@dreamit/graphql-server-base'
import {
    GraphQLServer,
    GraphQLServerOptions,
    JsonLogger,
    LogEntry,
    LogEntryInput,
    NoStacktraceJsonLogger,
} from 'src'

import { testDateString } from '@dreamit/funpara'
import {
    JsonContentTypeHeader,
    NoConsole,
    NoOpTestLogger,
    userSchema,
    userSchemaResolvers,
} from '@dreamit/graphql-testing'
import { IncomingHttpHeaders } from 'node:http'

export class JsonTestLogger extends JsonLogger {
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

export const LOGGER = new NoStacktraceJsonLogger(
    'nostack-logger',
    'myTestService',
    false,
)

export const INITIAL_GRAPHQL_SERVER_OPTIONS: GraphQLServerOptions = {
    logger: NoOpTestLogger,
    rootValue: userSchemaResolvers,
    schema: userSchema,
}

export function sendRequest(
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

export function sendRequestWithURL(
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
