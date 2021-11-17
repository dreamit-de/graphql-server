import {LogLevel} from './LogLevel';
import {LogEntry} from './LogEntry';
import {GraphQLError} from 'graphql';

export class LogHelper {
    static createLogEntry(logMessage: string, loglevel: LogLevel, loggerName: string, serviceName: string, error?: Error): LogEntry {
        const logEntry: LogEntry = {
            logger: loggerName,
            timestamp: LogHelper.createTimestamp(),
            message: logMessage,
            level: loglevel,
            serviceName: serviceName
        };

        if (error) {
            logEntry.errorName = error.name
            logEntry.message = logEntry.message + ' ' + error.message
            if (error.stack) {
                logEntry.stacktrace = error.stack;
            }

            if (error instanceof GraphQLError) {
                if (error.extensions && error.extensions.query) {
                    logEntry.query = error.extensions.query;
                } else if (error.source && error.source.body) {
                    logEntry.query = error.source.body;
                } else if (error.nodes) {
                    logEntry.query = JSON.stringify(error.nodes);
                }

                if (error.extensions && error.extensions.serviceName) {
                    logEntry.serviceName = error.extensions.serviceName;
                    logEntry.level = error.extensions.serviceName === serviceName ? LogLevel.Error : LogLevel.Warn;
                }

                if (error.extensions && error.extensions.exception) {
                    logEntry.stacktrace = error.extensions.exception;
                }
            }
        }
        return logEntry;
    }

    static createTimestamp(): string {
        return new Date().toISOString();
    }
}
