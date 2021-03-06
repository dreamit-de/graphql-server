import {
    Logger,
    LogLevel,
    LogEntry,
    LogHelper,
    GraphQLServerRequest
} from '..'

/**
 * Logger implementation that outputs log entries as text to console.
 */
export class TextLogger implements Logger {
    loggerName: string
    serviceName: string

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be used in output if not empty.
     * @param {string} serviceName - The service name of the logger.
     * Used to identify the graphql server and can be used to differentiate
     * it from remote graphql services like in a gateway setup.
     * Will be output to "serviceName" field in JSON.
     */
    constructor(loggerName: string, serviceName: string) {
        this.loggerName = loggerName
        this.serviceName = serviceName
    }

    debug(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.debug, request, undefined, undefined, context)
    }

    error(logMessage: string,
        error: Error,
        customErrorName: string,
        request?: GraphQLServerRequest,
        context?: unknown): void {
        this.logMessage(logMessage, LogLevel.error, request, error, customErrorName, context)
    }

    info(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.info, request, undefined, undefined, context)
    }

    warn(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.warn, request, undefined, undefined, context)
    }

    logMessage(logMessage: string,
        loglevel: LogLevel,
        request?: GraphQLServerRequest,
        error?: Error,
        customErrorName?: string,
        context?: unknown): void {
        const logEntry: LogEntry = LogHelper.createLogEntry(logMessage,
            loglevel,
            this.loggerName,
            this.serviceName,
            request,
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
