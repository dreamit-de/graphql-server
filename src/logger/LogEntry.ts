import { LogLevel } from './LogLevel'

export interface LogEntry {
    logger: string
    timestamp: string
    message: string
    level: LogLevel
    serviceName: string
    errorName?: string
    stacktrace?: string
    query?: string
}
