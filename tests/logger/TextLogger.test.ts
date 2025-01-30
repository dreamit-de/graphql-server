/* eslint-disable max-len, max-classes-per-file */
import { testDateFunction, testDateString } from '@dreamit/funpara'
import { LogEntry } from '@dreamit/graphql-server-base'
import { NoConsole } from '@dreamit/graphql-testing'
import { NoStacktraceTextLogger, TextLogger } from 'src'
import { expect, test } from 'vitest'

class TextTestLogger extends TextLogger {
    logEntries: string[] = new Array<string>()

    constructor(debugEnabled = false) {
        super(
            'test-logger',
            'test-service',
            debugEnabled,
            undefined,
            undefined,
            NoConsole,
        )
    }

    prepareLogOutput(logEntry: LogEntry, context?: unknown): string {
        logEntry.stacktrace = logEntry.stacktrace ? 'stacktrace' : undefined
        logEntry.timestamp = testDateString
        const logOutput = super.prepareLogOutput(logEntry, context)
        this.logEntries.push(logOutput)
        return logOutput
    }
}

class NoStacktraceTextTestLogger extends NoStacktraceTextLogger {
    logEntries: string[] = new Array<string>()

    constructor(debugEnabled = false) {
        super(
            'test-logger',
            'test-service',
            debugEnabled,
            undefined,
            undefined,
            NoConsole,
        )
    }

    prepareLogOutput(logEntry: LogEntry, context: unknown): string {
        logEntry.timestamp = testDateString
        const logOutput = super.prepareLogOutput(logEntry, context)
        this.logEntries.push(logOutput)
        return logOutput
    }
}

test('Creating a Logger should work with default options', () => {
    for (const logger of [
        new TextLogger('test-logger', 'test-service'),
        new NoStacktraceTextLogger('test-logger', 'test-service'),
    ]) {
        expect(logger.debugEnabled).toBe(false)
        expect(logger.truncateLimit).toBe(0)
        expect(logger.truncatedText).toBe('_TRUNCATED_')
    }
})

test.each([new TextTestLogger(), new NoStacktraceTextTestLogger()])(
    'logMessage should work even if no loglevel is provided',
    (logger: TextTestLogger | NoStacktraceTextTestLogger) => {
        logger.logMessage({
            context: undefined,
            logMessage: 'test',
        })
        // Then
        expect(logger.logEntries.at(0)).toBe(
            `${testDateString} [INFO]test-logger-test-service :test`,
        )
    },
)

test.each([new TextTestLogger(true), new NoStacktraceTextTestLogger(true)])(
    'Debug entry should be written if debug is enabled',
    (debugLogger: TextTestLogger | NoStacktraceTextTestLogger) => {
        debugLogger.debug('test', undefined, testDateFunction)
        expect(debugLogger.logEntries.at(0)).toBe(
            `${testDateString} [DEBUG]test-logger-test-service :test`,
        )
    },
)

test.each([new TextTestLogger(), new NoStacktraceTextTestLogger()])(
    'Debug entry should not be written if debug is disabled',
    (defaultLogger: TextTestLogger | NoStacktraceTextTestLogger) => {
        defaultLogger.debug('test')
        expect(defaultLogger.logEntries.length).toBe(0)
    },
)

test.each([new TextTestLogger(), new NoStacktraceTextTestLogger()])(
    'Error entry should be written',
    (defaultLogger: TextTestLogger | NoStacktraceTextTestLogger) => {
        const testError = new Error('error')
        testError.stack = 'stacktrace'
        defaultLogger.error(
            'error',
            testError,
            'custom',
            undefined,
            testDateFunction,
        )
        expect(defaultLogger.logEntries.at(0)).toBe(
            '1001-01-01T00:00:00.000Z [ERROR]test-logger-test-service :error error' +
                (defaultLogger instanceof NoStacktraceTextTestLogger
                    ? ''
                    : ' stacktrace'),
        )
    },
)

test.each([new TextTestLogger(), new NoStacktraceTextTestLogger()])(
    'Info entry should be written',
    (defaultLogger: TextTestLogger | NoStacktraceTextTestLogger) => {
        defaultLogger.info('info', undefined, testDateFunction)
        expect(defaultLogger.logEntries.at(0)).toBe(
            '1001-01-01T00:00:00.000Z [INFO]test-logger-test-service :info',
        )
    },
)

test.each([new TextTestLogger(), new NoStacktraceTextTestLogger()])(
    'Warn entry should be written',
    (defaultLogger: TextTestLogger | NoStacktraceTextTestLogger) => {
        defaultLogger.warn('warn', undefined, testDateFunction)
        expect(defaultLogger.logEntries.at(0)).toBe(
            '1001-01-01T00:00:00.000Z [WARN]test-logger-test-service :warn',
        )
    },
)
