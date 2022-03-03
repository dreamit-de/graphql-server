import {GraphQLServerRequest} from '..'

export interface Logger {
    readonly loggerName: string
    readonly serviceName: string

    debug(logMessage: string, request?: GraphQLServerRequest): void
    error(logMessage: string, 
        error: Error, 
        customErrorName: string, 
        request?: GraphQLServerRequest): void
    info(logMessage: string, request?: GraphQLServerRequest): void
    warn(logMessage: string, request?: GraphQLServerRequest): void
}
