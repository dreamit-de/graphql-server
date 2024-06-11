/* eslint-disable max-len */
import { NoLogger } from 'src'
import { expect, test } from 'vitest'

test('Should be able to use NoLogger without running into errors', () => {
    const logger = new NoLogger('no-logger', 'no-service')
    expect(logger.debugEnabled).toBe(false)
    const testMessage = 'Test message'

    // Then
    expect(() => logger.debug(testMessage)).not.toThrowError()
    expect(() =>
        logger.error(testMessage, new Error(testMessage)),
    ).not.toThrowError()
    expect(() => logger.info(testMessage)).not.toThrowError()
    expect(() => logger.warn(testMessage)).not.toThrowError()
})
