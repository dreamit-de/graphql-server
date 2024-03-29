import { Logger } from '@dreamit/graphql-server-base'
import { Console } from 'node:console'
import {
    LogEntry,
    LogEntryInput,
    LogLevel,
    createLogEntry,
    truncateLogMessage,
} from '..'

const loggerConsole: Console = new Console(
    process.stdout,
    process.stderr,
    false,
)

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonLogger implements Logger {
    loggerName = 'test'
    debugEnabled = false
    serviceName: string
    truncateLimit = 0
    truncatedText = '_TRUNCATED_'

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
     */
    constructor(
        loggerName: string,
        serviceName: string,
        debugEnabled = false,
        truncateLimit = 0,
        truncatedText = '_TRUNCATED_',
    ) {
        this.loggerName = loggerName
        this.serviceName = serviceName
        this.debugEnabled = debugEnabled
        this.truncateLimit = truncateLimit
        this.truncatedText = truncatedText
    }

    debug(logMessage: string, context?: unknown): void {
        if (this.debugEnabled) {
            this.logMessage({ context, logMessage, loglevel: LogLevel.debug })
        }
    }

    error(
        logMessage: string,
        error: Error,
        customErrorName: string,
        context?: unknown,
    ): void {
        this.logMessage({
            context,
            customErrorName,
            error,
            logMessage,
            loglevel: LogLevel.error,
        })
    }

    info(logMessage: string, context?: unknown): void {
        this.logMessage({ context, logMessage, loglevel: LogLevel.info })
    }

    warn(logMessage: string, context?: unknown): void {
        this.logMessage({ context, logMessage, loglevel: LogLevel.warn })
    }

    logMessage(logEntryInput: LogEntryInput): void {
        const { logMessage, loglevel, error, customErrorName, context } =
            logEntryInput

        const logEntry: LogEntry = createLogEntry({
            context,
            customErrorName,
            error,
            logMessage,
            loggerName: this.loggerName,
            loglevel,
            serviceName: this.serviceName,
        })
        loggerConsole.log(
            JSON.stringify(
                truncateLogMessage(
                    logEntry,
                    this.truncateLimit,
                    this.truncatedText,
                ),
            ),
        )
    }
}
