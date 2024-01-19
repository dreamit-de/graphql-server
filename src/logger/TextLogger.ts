import {
    LogEntry,
    LogEntryInput,
    LogLevel,
    createLogEntry,
    truncateLogMessage,
} from '..'
import { Logger } from '@dreamit/graphql-server-base'

/**
 * Logger implementation that outputs log entries as text to console.
 */
export class TextLogger implements Logger {
    loggerName: string
    serviceName: string
    debugEnabled = false
    truncateLimit = 0
    truncatedText = '_TRUNCATED_'

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be used in output if not empty.
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
            this.logMessage({
                context,
                logMessage,
                loglevel: LogLevel.debug,
            })
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
        this.logMessage({
            context,
            logMessage,
            loglevel: LogLevel.info,
        })
    }

    warn(logMessage: string, context?: unknown): void {
        this.logMessage({
            context,
            logMessage,
            loglevel: LogLevel.warn,
        })
    }

    logMessage(logEntryInput: LogEntryInput): void {
        const {
            logMessage,
            loglevel: loglevel,
            error,
            customErrorName,
            context,
        } = logEntryInput

        const logEntry: LogEntry = createLogEntry({
            context,
            customErrorName,
            error,
            logMessage,
            loggerName: this.loggerName,
            loglevel: loglevel,
            serviceName: this.serviceName,
        })
        const logOutput = this.prepareLogOutput(
            truncateLogMessage(
                logEntry,
                this.truncateLimit,
                this.truncatedText,
            ),
            context,
        )
        console.log(`${loglevel?.toUpperCase()} - ${logOutput}`)
    }

    /**
     * Prepares the text used in the log output.
     * Can be overwritten if it does not match expected output format.
     * @param {LogEntry} logEntry - The extracted log information.
     * @param {unknown} context - The context information
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prepareLogOutput(logEntry: LogEntry, context?: unknown): string {
        return (
            `${logEntry.timestamp} [${logEntry.level.toUpperCase()}]` +
            `${this.loggerName}-${this.serviceName} :` +
            `${logEntry.message} ${logEntry.stacktrace || ''}`
        )
    }
}
