/* eslint-disable @typescript-eslint/naming-convention */
import {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerResponse,
} from '@dreamit/graphql-server-base'
import {
    GraphQLServer,
    GraphQLServerOptions,
    JsonLogger,
    LogEntry,
    LogEntryInput,
    NoLogger,
    NoStacktraceJsonLogger,
} from 'src'
import { userSchema, userSchemaResolvers } from './ExampleSchemas'

import { testDateString } from '@dreamit/funpara'
import { Console } from 'node:console'
import { IncomingHttpHeaders } from 'node:http'

export class StandaloneGraphQLServerResponse implements GraphQLServerResponse {
    statusCode = 400
    headers = new Map<string, string | number | readonly string[]>()
    responses: Array<unknown> = new Array<unknown>()

    setHeader(name: string, value: string | number | readonly string[]): this {
        this.headers.set(name, value)
        return this
    }
    end(chunk: unknown): this {
        this.responses.push(chunk)
        return this
    }
    removeHeader(name: string): void {
        this.headers.delete(name)
    }
    getLastResponse(): string {
        const bufferedResponse = this.responses.at(-1)
        if (bufferedResponse && bufferedResponse instanceof Buffer) {
            return bufferedResponse.toString('utf8')
        }
        return ''
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getLastResponseAsObject(): any {
        return JSON.parse(this.getLastResponse())
    }
}

export const NO_CONSOLE = new Console(process.stdout)
NO_CONSOLE.log = (): void => {
    return
}

export class JsonTestLogger extends JsonLogger {
    logEntries: Array<LogEntry> = new Array<LogEntry>()

    constructor(debugEnabled = false) {
        super(
            'test-logger',
            'myTestService',
            debugEnabled,
            undefined,
            undefined,
            NO_CONSOLE,
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

export const JSON_CT_HEADER: IncomingHttpHeaders = {
    'content-type': 'application/json',
}

export const NO_LOGGER = new NoLogger('no-logger', 'myTestService')

export const LOGGER = new NoStacktraceJsonLogger(
    'nostack-logger',
    'myTestService',
    false,
)

export const INITIAL_GRAPHQL_SERVER_OPTIONS: GraphQLServerOptions = {
    logger: NO_LOGGER,
    rootValue: userSchemaResolvers,
    schema: userSchema,
}

export function generateGetParametersFromGraphQLRequestInfo(
    requestInfo: GraphQLRequestInfo,
): string {
    let result = ''
    if (requestInfo.query) {
        result += `query=${requestInfo.query}&`
    }
    if (requestInfo.operationName) {
        result += `operationName=${requestInfo.operationName}&`
    }
    if (requestInfo.variables) {
        result += `variables=${JSON.stringify(requestInfo.variables)}`
    }
    return encodeURI(result)
}

export function sendRequest(
    graphqlServer: GraphQLServer,
    response: GraphQLServerResponse,
    body: BodyInit,
    method = 'POST',
    // eslint-disable-next-line unicorn/no-object-as-default-parameter
    headers: IncomingHttpHeaders = JSON_CT_HEADER,
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
    headers: IncomingHttpHeaders = JSON_CT_HEADER,
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
