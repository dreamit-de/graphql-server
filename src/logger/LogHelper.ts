import {LogLevel} from './LogLevel'
import {LogEntry} from './LogEntry'
import {GraphQLError} from 'graphql'
import {GraphQLServerRequest} from '..'

export const VARIABLES_IN_MESSAGE_REGEX = new RegExp(/got invalid value (.*); Field/gm)

// eslint-disable-next-line unicorn/no-static-only-class
export class LogHelper {
    static createLogEntry(logMessage: string,
        loglevel: LogLevel,
        loggerName: string,
        serviceName: string,
        _request?: GraphQLServerRequest,
        error?: Error,
        customErrorName?: string,
        context?: unknown): LogEntry {
        const logEntry: LogEntry = {
            logger: loggerName,
            timestamp: LogHelper.createTimestamp(),
            message: LogHelper.sanitizeMessage(logMessage),
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
            logEntry.message = logEntry.message + ' ' + LogHelper.sanitizeMessage(error.message)
            if (error.stack) {
                logEntry.stacktrace =  LogHelper.sanitizeMessage(error.stack)
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
                    logEntry.stacktrace = LogHelper.sanitizeMessage(
                        error.extensions.exception as string
                    )
                }
            }
        }
        return logEntry
    }

    static createTimestamp(): string {
        return new Date().toISOString()
    }

    /**
     * Removes sensible information that might occur when
     * variables are used in log messages from the message.
     * @param {string} logMessage - The original log message
     * @returns {string} The sanitized message. Sensible parts will
     * be overwritten with the text REMOVED BY SANITIZER
     */
    static sanitizeMessage(logMessage: string): string {
        let foundVariable
        if (logMessage && (foundVariable = VARIABLES_IN_MESSAGE_REGEX.exec(logMessage))) {
            return logMessage.replace(foundVariable[1], 'REMOVED BY SANITIZER')
        }
        return logMessage
    }
}
