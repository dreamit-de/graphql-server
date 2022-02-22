import {Logger} from './Logger'
import {Console} from 'node:console'
import {LogLevel} from './LogLevel'
import {LogEntry} from './LogEntry'
import {LogHelper} from './LogHelper'
import {GraphQLServerRequest} from '..'

const loggerConsole: Console = new Console(process.stdout, process.stderr, false)

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonLogger implements Logger {
    loggerName = 'test'
    serviceName: string

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be output to "logger" field in JSON.
     * @param {string} serviceName - The service name of the logger.
     * Used to identify the graphql server and can be used to differentiate
     * it from remote graphql services like in a gateway setup.
     * Will be output to "serviceName" field in JSON.
     */
    constructor(loggerName: string, serviceName: string) {
        this.loggerName = loggerName
        this.serviceName = serviceName
    }

    debug(logMessage: string, request?: GraphQLServerRequest): void {
        this.logMessage(logMessage, LogLevel.debug, request)
    }

    error(logMessage: string, 
        error: Error, 
        customErrorName: string, 
        request?: GraphQLServerRequest): void {
        this.logMessage(logMessage, LogLevel.error, request, error, customErrorName)
    }

    info(logMessage: string, request?: GraphQLServerRequest): void {
        this.logMessage(logMessage, LogLevel.info, request)
    }

    warn(logMessage: string, request?: GraphQLServerRequest): void {
        this.logMessage(logMessage, LogLevel.warn, request)
    }

    logMessage(logMessage: string,
        loglevel: LogLevel,
        request?: GraphQLServerRequest,
        error?: Error,
        customErrorName?: string): void {
        const logEntry: LogEntry = LogHelper.createLogEntry(logMessage,
            loglevel,
            this.loggerName,
            this.serviceName,
            request,
            error,
            customErrorName)
        loggerConsole.log(JSON.stringify(logEntry))
    }
}
