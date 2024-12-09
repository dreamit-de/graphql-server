import { DateFunction } from '@dreamit/funpara'
import { LogLevel } from './LogLevel'

export interface LogEntryInput {
    context: unknown
    customErrorName?: string
    dateFunction?: DateFunction
    error?: Error
    logMessage: string
    loglevel?: LogLevel
    loggerName?: string
    serviceName?: string
}
