import { LogLevel } from '..'

export interface LogEntryInput {
    context: unknown
    customErrorName?: string
    error?: Error
    logMessage: string
    loglevel?: LogLevel
    loggerName?: string
    serviceName?: string
}
