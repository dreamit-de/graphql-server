import {GraphQLServerRequest} from '..'

export interface Logger {
    readonly loggerName: string
    readonly serviceName: string

    debug(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void
    error(logMessage: string,
        error: Error,
        customErrorName: string,
        request?: GraphQLServerRequest,
        context?: unknown): void
    info(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void
    warn(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void
}
