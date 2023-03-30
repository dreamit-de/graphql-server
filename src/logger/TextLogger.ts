import {Logger} from '@sgohlke/graphql-server-base'
import {
    createLogEntry,
    LogLevel,
    LogEntry,
} from '..'

/**
 * Logger implementation that outputs log entries as text to console.
 */
export class TextLogger implements Logger {
    loggerName: string
    serviceName: string
    debugEnabled = false

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be used in output if not empty.
     * @param {string} serviceName - The service name of the logger.
     * Used to identify the graphql server and can be used to differentiate
     * it from remote graphql services like in a gateway setup.
     * Will be output to "serviceName" field in JSON.
     * @param {boolean} debugEnabled - If debug output should be enabled
     */
    constructor(loggerName: string, serviceName: string, debugEnabled = false) {
        this.loggerName = loggerName
        this.serviceName = serviceName
        this.debugEnabled = debugEnabled
    }

    debug(logMessage: string, context?: unknown): void {
        if (this.debugEnabled) {
            this.logMessage(logMessage, LogLevel.debug,  undefined, undefined, context)
        }
    }

    error(logMessage: string,
        error: Error,
        customErrorName: string,
        context?: unknown): void {
        this.logMessage(logMessage, LogLevel.error, error, customErrorName, context)
    }

    info(logMessage: string, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.info, undefined, undefined, context)
    }

    warn(logMessage: string, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.warn,  undefined, undefined, context)
    }

    logMessage(logMessage: string,
        loglevel: LogLevel,
        error?: Error,
        customErrorName?: string,
        context?: unknown): void {
        const logEntry: LogEntry = createLogEntry(logMessage,
            loglevel,
            this.loggerName,
            this.serviceName,
            error,
            customErrorName,
            context)
        const logOutput = this.prepareLogOutput(logEntry, context)
        console.log(`${loglevel.toUpperCase()} - ${logOutput}`)
    }

    /**
     * Prepares the text used in the log output.
     * Can be overwritten if it does not match expected output format.
     * @param {LogEntry} logEntry - The extracted log information.
     * @param {unknown} context - The context information
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prepareLogOutput(logEntry: LogEntry, context?: unknown): string {
        return `${logEntry.timestamp} [${logEntry.level.toUpperCase()}]`
            + `${this.loggerName}-${this.serviceName} :`
            + `${logEntry.message} ${logEntry.stacktrace || ''}`
    }
}
