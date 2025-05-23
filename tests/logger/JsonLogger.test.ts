/* eslint-disable max-len */
import { testDateFunction, testDateString } from '@dreamit/funpara'
import type { LogEntry, LogEntryInput } from '@dreamit/graphql-server-base'
import { NoConsole } from '@dreamit/graphql-testing'
import { JsonLogger, NoStacktraceJsonLogger } from 'src'
import { expect, test } from 'vitest'
import { JsonTestLogger } from '../TestHelpers'

class NoStacktraceJsonTestLogger extends NoStacktraceJsonLogger {
    logEntries: LogEntry[] = new Array<LogEntry>()

    constructor(debugEnabled = false) {
        super(
            'test-logger',
            'myTestService',
            debugEnabled,
            undefined,
            undefined,
            NoConsole,
        )
    }

    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const logEntry = super.createLogEntry(logEntryInput)
        logEntry.timestamp = testDateString
        this.logEntries.push(logEntry)
        return logEntry
    }
}

test('Creating a Logger should work with default options', () => {
    for (const logger of [
        new JsonLogger('test-logger', 'test-service'),
        new NoStacktraceJsonLogger('test-logger', 'test-service'),
    ]) {
        expect(logger.debugEnabled).toBe(false)
        expect(logger.truncateLimit).toBe(0)
        expect(logger.truncatedText).toBe('_TRUNCATED_')
    }
})

test.each([new JsonTestLogger(true), new NoStacktraceJsonTestLogger(true)])(
    'Debug entry should be written if debug is enabled',
    (debugLogger: JsonTestLogger | NoStacktraceJsonTestLogger) => {
        debugLogger.debug('test', {}, testDateFunction)
        const logEntry = debugLogger.logEntries.at(0)
        expect(logEntry?.message).toBe('test')
        expect(logEntry?.level).toBe('DEBUG')
    },
)

test.each([new JsonTestLogger(), new NoStacktraceJsonTestLogger()])(
    'Debug entry should not be written if debug is disabled',
    (defaultLogger: JsonTestLogger | NoStacktraceJsonTestLogger) => {
        defaultLogger.debug('test', {})
        expect(defaultLogger.logEntries.length).toBe(0)
    },
)

test.each([new JsonTestLogger(), new NoStacktraceJsonTestLogger()])(
    'Error entry should be written',
    (defaultLogger: JsonTestLogger | NoStacktraceJsonTestLogger) => {
        const testError = new Error('error')
        testError.stack = 'stacktrace'
        defaultLogger.error('error', {}, testError, 'custom', testDateFunction)
        const createdLogEntry = defaultLogger.logEntries.at(0)
        expect(createdLogEntry?.level).toBe('ERROR')
        expect(createdLogEntry?.message).toBe('error error')
        expect(createdLogEntry?.errorName).toBe('custom')
        expect(createdLogEntry?.stacktrace).toBe(
            defaultLogger instanceof NoStacktraceJsonTestLogger
                ? undefined
                : 'stacktrace',
        )
    },
)

test.each([new JsonTestLogger(), new NoStacktraceJsonTestLogger()])(
    'Info entry should be written',
    (defaultLogger: JsonTestLogger | NoStacktraceJsonTestLogger) => {
        defaultLogger.info('info', {}, testDateFunction)
        const createdLogEntry = defaultLogger.logEntries.at(0)
        expect(createdLogEntry?.level).toBe('INFO')
        expect(createdLogEntry?.message).toBe('info')
    },
)

test.each([new JsonTestLogger(), new NoStacktraceJsonTestLogger()])(
    'Warn entry should be written',
    (defaultLogger: JsonTestLogger | NoStacktraceJsonTestLogger) => {
        defaultLogger.warn('warn', {}, testDateFunction)
        const createdLogEntry = defaultLogger.logEntries.at(0)
        expect(createdLogEntry?.level).toBe('WARN')
        expect(createdLogEntry?.message).toBe('warn')
    },
)
