import {Request} from '../server/GraphQLServer'

export interface Logger {
    readonly loggerName: string
    readonly serviceName: string

    debug(logMessage: string, request?: Request): void
    error(logMessage: string, error: Error, customErrorName: string, request?: Request): void
    info(logMessage: string, request?: Request): void
    warn(logMessage: string, request?: Request): void
}
