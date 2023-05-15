import {
    GraphQLServerOptions,
    JsonLogger,
    LogEntry,
    LogEntryInput,
    TextLogger,
    createLogEntry
} from '~/src'
import {
    userSchema,
    userSchemaResolvers
} from './ExampleSchemas'
import {Console} from 'node:console'
import { GraphQLRequestInfo } from '@dreamit/graphql-server-base'
import fetch from 'cross-fetch'

export class NoStacktraceJsonLogger extends JsonLogger {
    loggerConsole: Console = new Console(process.stdout, process.stderr, false)
    logMessage(logEntryInput: LogEntryInput): void {
        const {
            logMessage,
            loglevel,
            error,
            customErrorName,
            context
        } = logEntryInput

        const logEntry: LogEntry = createLogEntry({
            context,
            customErrorName,
            error,
            logMessage,
            loggerName: this.loggerName,
            loglevel,
            serviceName: this.serviceName
        })
        logEntry.stacktrace = undefined
        this.loggerConsole.log(JSON.stringify(logEntry))
    }
}

export class NoStacktraceTextLogger extends TextLogger {
    prepareLogOutput(logEntry: LogEntry): string {
        return `${logEntry.timestamp} [${logEntry.level.toUpperCase()}]`
            + `${this.loggerName}-${this.serviceName} :`
            + `${logEntry.message}`
    }
}

export const GRAPHQL_SERVER_PORT = 3000
export const LOGGER = new NoStacktraceJsonLogger('nostack-logger', 'myTestService', false)
export const TEXT_LOGGER = new NoStacktraceTextLogger('nostack-logger', 'myTestService', false)
export const INITIAL_GRAPHQL_SERVER_OPTIONS: GraphQLServerOptions =
    {
        logger: LOGGER,
        rootValue: userSchemaResolvers,
        schema: userSchema
    }

export function generateGetParametersFromGraphQLRequestInfo(requestInfo: GraphQLRequestInfo)
: string {
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

export function fetchResponse(body: BodyInit,
    method = 'POST',
    // eslint-disable-next-line unicorn/no-object-as-default-parameter
    headers: HeadersInit = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json'
    }): Promise<Response> {
    return fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/graphql`,
        {
            body: body,
            headers: headers,
            method: method
        })
}
