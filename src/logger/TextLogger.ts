import {Logger} from './Logger'
import {LogLevel} from './LogLevel'
import {LogEntry} from './LogEntry'
import {LogHelper} from './LogHelper'
import {Request} from '../server/GraphQLServer'

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

    debug(logMessage: string, request?: Request): void {
        this.logMessage(logMessage, LogLevel.debug, request)
    }

    error(logMessage: string, error: Error, customErrorName: string, request?: Request): void {
        this.logMessage(logMessage, LogLevel.error, request, error)
    }

    info(logMessage: string, request?: Request): void {
        this.logMessage(logMessage, LogLevel.info, request)
    }

    warn(logMessage: string, request?: Request): void {
        this.logMessage(logMessage, LogLevel.warn, request)
    }

    logMessage(logMessage: string,
        loglevel: LogLevel,
        request?: Request,
        error?: Error,
        customErrorName?: string): void {
        const logEntry: LogEntry = LogHelper.createLogEntry(logMessage,
            loglevel,
            this.loggerName,
            this.serviceName,
            request,
            error,
            customErrorName)
        const logOutput = this.prepareLogOutput(logEntry)
        console.log(`${loglevel.toUpperCase()} - ${logOutput}`)
    }

    /**
     * Prepares the text used in the log output.
     * Can be overwritten if it does not match expected output format.
     * @param {LogEntry} logEntry - The extracted log information.
     */
    prepareLogOutput(logEntry: LogEntry): string {
        return `${logEntry.timestamp} [${logEntry.level.toUpperCase()}]`
            + `${this.loggerName}-${this.serviceName} :`
            + `${logEntry.message} ${logEntry.stacktrace || ''}`
    }
}
