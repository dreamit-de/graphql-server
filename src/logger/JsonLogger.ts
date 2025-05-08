import { DateFunction } from '@dreamit/funpara'
import { LogEntry, LogEntryInput, Logger } from '@dreamit/graphql-server-base'
import { Console } from 'node:console'
import { createLogEntry } from './CreateLogEntry'
import { truncateLogMessage } from './TruncateLogMessage'

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonLogger implements Logger {
    loggerName: string
    debugEnabled: boolean
    serviceName: string
    truncateLimit: number
    truncatedText: string
    loggerConsole: Console

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be output to "logger" field in JSON.
     * @param {string} serviceName - The service name of the logger.
     * Used to identify the graphql server and can be used to differentiate
     * it from remote graphql services like in a gateway setup.
     * Will be output to "serviceName" field in JSON.
     * @param {boolean} debugEnabled - If debug output should be enabled
     * @param {number} truncateLimit - The length of the message before the message gets truncated.
     * Default: undefined/0 (off).
     * @param {string} truncatedText - The text to display if a message is truncated.
     * @param {Console} loggerConsole - The Console to use for logging
     */
    constructor(
        loggerName: string,
        serviceName: string,
        debugEnabled = false,
        truncateLimit = 0,
        truncatedText = '_TRUNCATED_',
        loggerConsole: Console = new Console(process.stdout, process.stderr),
    ) {
        this.loggerName = loggerName
        this.serviceName = serviceName
        this.debugEnabled = debugEnabled
        this.truncateLimit = truncateLimit
        this.truncatedText = truncatedText
        this.loggerConsole = loggerConsole
    }

    debug(
        logMessage: string,
        context: Record<string, unknown>,
        dateFunction?: DateFunction,
    ): void {
        if (this.debugEnabled) {
            this.logMessage({
                context,
                dateFunction,
                logMessage,
                loglevel: 'DEBUG',
            })
        }
    }

    error(
        logMessage: string,
        context: Record<string, unknown>,
        error: Error,
        customErrorName: string,
        dateFunction?: DateFunction,
    ): void {
        this.logMessage({
            context,
            customErrorName,
            dateFunction,
            error,
            logMessage,
            loglevel: 'ERROR',
        })
    }

    info(
        logMessage: string,
        context: Record<string, unknown>,
        dateFunction?: DateFunction,
    ): void {
        this.logMessage({
            context,
            dateFunction,
            logMessage,
            loglevel: 'INFO',
        })
    }

    warn(
        logMessage: string,
        context: Record<string, unknown>,
        dateFunction?: DateFunction,
    ): void {
        this.logMessage({
            context,
            dateFunction,
            logMessage,
            loglevel: 'WARN',
        })
    }

    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const {
            dateFunction,
            logMessage,
            loglevel,
            error,
            customErrorName,
            context,
        } = logEntryInput

        return truncateLogMessage(
            createLogEntry({
                context,
                customErrorName,
                dateFunction,
                error,
                logMessage,
                loggerName: this.loggerName,
                loglevel,
                serviceName: this.serviceName,
            }),
            this.truncateLimit,
            this.truncatedText,
        )
    }

    logMessage(logEntryInput: LogEntryInput): void {
        this.loggerConsole.log(
            JSON.stringify(this.createLogEntry(logEntryInput)),
        )
    }
}
