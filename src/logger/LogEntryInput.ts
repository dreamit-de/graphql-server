import { LogLevel } from '..'

export interface LogEntryInput {
    logMessage: string,
    loglevel?: LogLevel,
    loggerName?: string,
    serviceName?: string,
    error?: Error,
    customErrorName?: string,
    context?: unknown
}