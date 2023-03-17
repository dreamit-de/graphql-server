import {GraphQLError} from 'graphql'
import {
    createTimestamp,
    LogEntry,
    LogLevel,
    sanitizeMessage
} from '..'

export function createLogEntry(logMessage: string,
    loglevel: LogLevel,
    loggerName: string,
    serviceName: string,
    error?: Error,
    customErrorName?: string,
    context?: unknown): LogEntry {
    const logEntry: LogEntry = {
        logger: loggerName,
        timestamp: createTimestamp(),
        message: sanitizeMessage(logMessage),
        level: loglevel,
        serviceName: serviceName
    }

    // If there is a serviceName in the context, use it as serviceName for the LogEntry
    const contextRecord =  context as Record<string, unknown>
    if (contextRecord && contextRecord.serviceName) {
        logEntry.serviceName = contextRecord.serviceName as string
        if (loglevel === LogLevel.error && contextRecord.serviceName !== serviceName) {
            logEntry.level = LogLevel.warn
        }
    }

    if (error) {
        logEntry.errorName = customErrorName ?? error.name
        logEntry.message = logEntry.message + ' ' + sanitizeMessage(error.message)
        if (error.stack) {
            logEntry.stacktrace =  sanitizeMessage(error.stack)
        }

        if (error instanceof GraphQLError) {
            if (error.extensions.query) {
                logEntry.query = error.extensions.query as string
            } else if (error.source && error.source.body) {
                logEntry.query = error.source.body
            } else if (error.nodes) {
                logEntry.query = JSON.stringify(error.nodes)
            }

            if (error.extensions.serviceName) {
                logEntry.serviceName = error.extensions.serviceName as string
                logEntry.level = error.extensions.serviceName === serviceName
                    ? LogLevel.error
                    : LogLevel.warn
            }

            if (error.extensions.exception) {
                logEntry.stacktrace = sanitizeMessage(
                    error.extensions.exception as string
                )
            }
        }
    }
    return logEntry
}