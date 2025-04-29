import { LogEntry, LogEntryInput } from '@dreamit/graphql-server-base'
import { GraphQLError } from 'graphql'
import { createISOTimestamp } from './CreateTimestamp'
import { sanitizeMessage } from './SanitizeMessage'

export function createLogEntry(logEntryInput: LogEntryInput): LogEntry {
    const {
        dateFunction,
        loggerName,
        logMessage,
        loglevel,
        serviceName,
        context,
        error,
        customErrorName,
    } = logEntryInput

    const logEntry: LogEntry = {
        level: loglevel ?? 'INFO',
        logger: loggerName ?? 'fallback-logger',
        message: sanitizeMessage(logMessage),
        serviceName: serviceName ?? 'fallback-service',
        timestamp: createISOTimestamp(dateFunction),
    }

    // If there is a serviceName in the context, use it as serviceName for the LogEntry
    if (context.serviceName) {
        logEntry.serviceName = context.serviceName as string
        if (loglevel === 'ERROR' && context.serviceName !== serviceName) {
            logEntry.level = 'WARN'
        }
    }
    if (context.query) {
        logEntry.query = context.query as string
    }

    if (error) {
        logEntry.errorName = customErrorName ?? error.name
        logEntry.message =
            `${logEntry.message} ${sanitizeMessage(error.message)}`.trim()
        if (error.stack) {
            logEntry.stacktrace = sanitizeMessage(error.stack)
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
                logEntry.level =
                    error.extensions.serviceName === serviceName
                        ? 'ERROR'
                        : 'WARN'
            }

            if (error.extensions.exception) {
                logEntry.stacktrace = sanitizeMessage(
                    error.extensions.exception as string,
                )
            }
        }
    }
    return logEntry
}
