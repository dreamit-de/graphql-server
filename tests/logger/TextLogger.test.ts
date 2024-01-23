/* eslint-disable max-len */
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { TextLogger } from '~/src'

class NoLoglevelTextLogger extends TextLogger {
    prepareLogOutput(): string {
        return 'doesnotmatter'
    }
}

describe('Test TextLogger.logMessage with no given loglevel', () => {
    beforeAll(() => {
        vi.spyOn(console, 'log')
    })

    afterAll(() => {
        vi.restoreAllMocks()
    })

    test('logMessage should work even if no loglevel is provided', () => {
        new NoLoglevelTextLogger('test-logger', 'test-service').logMessage({
            context: undefined,
            logMessage: 'test',
        })
        // Then
        expect(console.log).toHaveBeenCalledTimes(1)
        expect(console.log).toHaveBeenLastCalledWith(
            'undefined - doesnotmatter',
        )
    })
})
