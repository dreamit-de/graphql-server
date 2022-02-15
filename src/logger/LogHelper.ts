import {LogLevel} from './LogLevel'
import {LogEntry} from './LogEntry'
import {GraphQLError} from 'graphql'
import {Request} from '../server/GraphQLServer'

export const VARIABLES_IN_MESSAGE_REGEX = new RegExp(/got invalid value (.*); Field/gm)

export class LogHelper {
    static createLogEntry(logMessage: string,
        loglevel: LogLevel,
        loggerName: string,
        serviceName: string,
        request?: Request,
        error?: Error,
        customErrorName?: string): LogEntry {
        const logEntry: LogEntry = {
            logger: loggerName,
            timestamp: LogHelper.createTimestamp(),
            message: LogHelper.sanitizeMessage(logMessage),
            level: loglevel,
            serviceName: serviceName
        }

        if (error) {
            logEntry.errorName = customErrorName ?? error.name
            logEntry.message = logEntry.message + ' ' + LogHelper.sanitizeMessage(error.message)
            if (error.stack) {
                logEntry.stacktrace = error.stack
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
                    logEntry.stacktrace = error.extensions.exception as string
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
