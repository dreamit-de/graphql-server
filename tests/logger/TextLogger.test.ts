/* eslint-disable max-len */
import { Console } from 'node:console'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { TextLogger } from '~/src'

class NoLoglevelTextLogger extends TextLogger {
    prepareLogOutput(): string {
        return 'doesnotmatter'
    }
}

describe('Test TextLogger.logMessage with no given loglevel', () => {
    const loggerConsole = new Console(process.stdout, process.stderr, false)
    beforeAll(() => {
        vi.spyOn(loggerConsole, 'log')
    })

    afterAll(() => {
        vi.restoreAllMocks()
    })

    test('logMessage should work even if no loglevel is provided', () => {
        new NoLoglevelTextLogger(
            'test-logger',
            'test-service',
            undefined,
            undefined,
            undefined,
            loggerConsole,
        ).logMessage({
            context: undefined,
            logMessage: 'test',
        })
        // Then
        expect(loggerConsole.log).toHaveBeenCalledTimes(1)
        expect(loggerConsole.log).toHaveBeenLastCalledWith(
            'undefined - doesnotmatter',
        )
    })
})
