import {
    JsonLogger,
    NoStacktraceJsonLogger,
    NoStacktraceTextLogger,
    TextLogger,
} from '@/index'
import { testDateFunction } from '@dreamit/funpara'
import { Logger } from '@dreamit/graphql-server-base'
import { Console } from 'node:console'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const loggerConsole = new Console(process.stdout, process.stderr)

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
        new JsonLogger(
            'test-logger',
            'test-service',
            false,
            undefined,
            undefined,
            loggerConsole,
        ),
        new JsonLogger(
            'test-logger',
            'test-service',
            true,
            undefined,
            undefined,
            loggerConsole,
        ),
    ],
    [
        new TextLogger(
            'test-logger',
            'test-service',
            false,
            undefined,
            undefined,
            loggerConsole,
        ),
        new TextLogger(
            'test-logger',
            'test-service',
            true,
            undefined,
            undefined,
            loggerConsole,
        ),
    ],
    [
        new NoStacktraceJsonLogger(
            'test-logger',
            'test-service',
            false,
            undefined,
            undefined,
            loggerConsole,
        ),
        new NoStacktraceJsonLogger(
            'test-logger',
            'test-service',
            true,
            undefined,
            undefined,
            loggerConsole,
        ),
    ],
    [
        new NoStacktraceTextLogger(
            'test-logger',
            'test-service',
            false,
            undefined,
            undefined,
            loggerConsole,
        ),
        new NoStacktraceTextLogger(
            'test-logger',
            'test-service',
            true,
            undefined,
            undefined,
            loggerConsole,
        ),
    ],
])(
    'Logging functions should work',
    (defaultLogger: Logger, debugLogger: Logger) => {
        beforeEach(() => {
            vi.spyOn(loggerConsole, 'log')
        })

        afterEach(() => {
            vi.restoreAllMocks()
        })

        test('Debug entry should be written if debug is enabled', () => {
            debugLogger.debug('test', undefined, testDateFunction)
            expect(loggerConsole.log).toHaveBeenCalledTimes(1)
            if (debugLogger instanceof JsonLogger) {
                expect(loggerConsole.log).toHaveBeenLastCalledWith(
                    '{"level":"DEBUG","logger":"test-logger","message":"test","serviceName":"test-service","timestamp":"1001-01-01T00:00:00.000Z"}',
                )
            } else {
                expect(loggerConsole.log).toHaveBeenLastCalledWith(
                    'DEBUG - 1001-01-01T00:00:00.000Z [DEBUG]test-logger-test-service :test',
                )
            }
        })

        test('Debug entry should not be written if debug is enabled', () => {
            defaultLogger.debug('test')
            expect(loggerConsole.log).toHaveBeenCalledTimes(0)
        })

        test('Error entry should be written', () => {
            const testError = new Error('error')
            testError.stack = 'stacktrace'
            defaultLogger.error(
                'error',
                testError,
                'custom',
                undefined,
                testDateFunction,
            )
            expect(loggerConsole.log).toHaveBeenCalledTimes(1)
            if (defaultLogger instanceof JsonLogger) {
                if (defaultLogger instanceof NoStacktraceJsonLogger) {
                    expect(loggerConsole.log).toHaveBeenLastCalledWith(
                        '{"level":"ERROR","logger":"test-logger","message":"error error","serviceName":"test-service","timestamp":"1001-01-01T00:00:00.000Z","errorName":"custom"}',
                    )
                } else {
                    expect(loggerConsole.log).toHaveBeenLastCalledWith(
                        '{"level":"ERROR","logger":"test-logger","message":"error error","serviceName":"test-service","timestamp":"1001-01-01T00:00:00.000Z","errorName":"custom","stacktrace":"stacktrace"}',
                    )
                }
            } else if (defaultLogger instanceof TextLogger) {
                if (defaultLogger instanceof NoStacktraceTextLogger) {
                    expect(loggerConsole.log).toHaveBeenLastCalledWith(
                        'ERROR - 1001-01-01T00:00:00.000Z [ERROR]test-logger-test-service :error error',
                    )
                } else {
                    expect(loggerConsole.log).toHaveBeenLastCalledWith(
                        'ERROR - 1001-01-01T00:00:00.000Z [ERROR]test-logger-test-service :error error stacktrace',
                    )
                }
            }
        })

        test('Info entry should be written', () => {
            defaultLogger.info('info', undefined, testDateFunction)
            expect(loggerConsole.log).toHaveBeenCalledTimes(1)
            if (defaultLogger instanceof JsonLogger) {
                expect(loggerConsole.log).toHaveBeenLastCalledWith(
                    '{"level":"INFO","logger":"test-logger","message":"info","serviceName":"test-service","timestamp":"1001-01-01T00:00:00.000Z"}',
                )
            } else {
                expect(loggerConsole.log).toHaveBeenLastCalledWith(
                    'INFO - 1001-01-01T00:00:00.000Z [INFO]test-logger-test-service :info',
                )
            }
        })

        test('Warn entry should be written', () => {
            defaultLogger.warn('warn', undefined, testDateFunction)
            expect(loggerConsole.log).toHaveBeenCalledTimes(1)
            if (defaultLogger instanceof JsonLogger) {
                expect(loggerConsole.log).toHaveBeenLastCalledWith(
                    '{"level":"WARN","logger":"test-logger","message":"warn","serviceName":"test-service","timestamp":"1001-01-01T00:00:00.000Z"}',
                )
            } else {
                expect(loggerConsole.log).toHaveBeenLastCalledWith(
                    'WARN - 1001-01-01T00:00:00.000Z [WARN]test-logger-test-service :warn',
                )
            }
        })
    },
)
