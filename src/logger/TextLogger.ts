import {Logger} from './Logger';
import {LogLevel} from './LogLevel';
import {LogEntry} from './LogEntry';
import {LogHelper} from './LogHelper';

/**
 * Logger implementation that outputs log entries as text to console.
 */
export class TextLogger implements Logger {
    loggerName: string;
    serviceName: string;

    /** Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger. Will be used in output if not empty.
     * @param {string} serviceName - The service name of the logger. Used to identify the graphql server and can be used to differentiate it from remote graphql services like in a gateway setup. Will be output to "serviceName" field in JSON.
     */
    constructor(loggerName: string, serviceName: string) {
        this.loggerName = loggerName
        this.serviceName = serviceName
    }

    debug(logMessage: string) {
        this.logMessage(logMessage, LogLevel.Debug)
    }

    error(logMessage: string, error: Error): void {
        this.logMessage(logMessage, LogLevel.Error, error)
    }

    info(logMessage: string): void {
        this.logMessage(logMessage, LogLevel.Info)
    }

    warn(logMessage: string): void {
        this.logMessage(logMessage, LogLevel.Warn)
    }

    logMessage(logMessage: string, loglevel: LogLevel, error?: Error): void {
        const logEntry: LogEntry = LogHelper.createLogEntry(logMessage, loglevel, this.loggerName, this.serviceName, error)
        const logOutput = this.prepareLogOutput(logEntry)
        console.log(`${loglevel.toUpperCase()} - ${logOutput}`)
    }

    /** Prepares the text used in the log output. Can be overwritten if it does not match expected output format.
     * @param {LogEntry} logEntry - The extracted log information.
     */
    prepareLogOutput(logEntry: LogEntry): string {
        return `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${this.loggerName}-${this.serviceName} : ${logEntry.message} ${logEntry.stacktrace || ''}`
    }
}
