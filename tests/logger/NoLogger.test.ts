/* eslint-disable max-len */
import { expect, test } from 'vitest'
import { NoLogger } from '~/src'

test('Should be able to use NoLogger without running into errors', () => {
    const logger = new NoLogger('no-logger', 'no-service')
    const testMessage = 'Test message'

    // Then
    expect(() => logger.debug(testMessage)).not.toThrowError()
    expect(() =>
        logger.error(testMessage, new Error(testMessage))).not.toThrowError()
    expect(() => logger.info(testMessage)).not.toThrowError()
    expect(() => logger.warn(testMessage)).not.toThrowError()
})
