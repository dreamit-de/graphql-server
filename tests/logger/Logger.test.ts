import {
    JsonLogger,
    NoStacktraceJsonLogger,
    NoStacktraceTextLogger,
    TextLogger,
} from '@/index'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

test('Creating a Logger should work with default options', () => {
    for (const logger of [
        new JsonLogger('test-logger', 'test-service'),
        new TextLogger('test-logger', 'test-service'),
        new NoStacktraceJsonLogger('test-logger', 'test-service'),
        new NoStacktraceTextLogger('test-logger', 'test-service'),
    ]) {
        expect(logger.debugEnabled).toBe(false)
        expect(logger.truncateLimit).toBe(0)
        expect(logger.truncatedText).toBe('_TRUNCATED_')
    }
})

describe.each([
    [
        new JsonLogger('test-logger', 'test-service'),
        new JsonLogger('test-logger', 'test-service', true),
    ],
    [
        new TextLogger('test-logger', 'test-service'),
        new TextLogger('test-logger', 'test-service', true),
    ],
    [
        new NoStacktraceJsonLogger('test-logger', 'test-service'),
        new NoStacktraceJsonLogger('test-logger', 'test-service', true),
    ],
    [
        new NoStacktraceTextLogger('test-logger', 'test-service'),
        new NoStacktraceTextLogger('test-logger', 'test-service', true),
    ],
])('Logging functions should work', (defaultLogger, debugLogger) => {
    beforeEach(() => {
        vi.spyOn(defaultLogger, 'logMessage')
        vi.spyOn(debugLogger, 'logMessage')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('Debug entry should be written if debug is enabled', () => {
        debugLogger.debug('test')
        expect(debugLogger.logMessage).toHaveBeenCalledTimes(1)
        expect(debugLogger.logMessage).toHaveBeenLastCalledWith({
            context: undefined,
            logMessage: 'test',
            loglevel: 'DEBUG',
        })
    })

    test('Debug entry should not be written if debug is enabled', () => {
        defaultLogger.debug('test')
        expect(defaultLogger.logMessage).toHaveBeenCalledTimes(0)
    })

    test('Error entry should be written', () => {
        const testError = new Error('error')
        defaultLogger.error('error', testError, 'custom')
        expect(defaultLogger.logMessage).toHaveBeenCalledTimes(1)
        expect(defaultLogger.logMessage).toHaveBeenLastCalledWith({
            context: undefined,
            customErrorName: 'custom',
            error: testError,
            logMessage: 'error',
            loglevel: 'ERROR',
        })
    })

    test('Info entry should be written', () => {
        defaultLogger.info('info')
        expect(defaultLogger.logMessage).toHaveBeenCalledTimes(1)
        expect(defaultLogger.logMessage).toHaveBeenLastCalledWith({
            context: undefined,
            logMessage: 'info',
            loglevel: 'INFO',
        })
    })

    test('Warn entry should be written', () => {
        defaultLogger.warn('warn')
        expect(defaultLogger.logMessage).toHaveBeenCalledTimes(1)
        expect(defaultLogger.logMessage).toHaveBeenLastCalledWith({
            context: undefined,
            logMessage: 'warn',
            loglevel: 'WARN',
        })
    })
})
