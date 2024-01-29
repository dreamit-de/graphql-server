/* eslint-disable max-len */
import { expect, test } from 'vitest'
import { NoLogger } from '~/src'

test('Should be able to use NoLogger without running into errors', () => {
    const logger = new NoLogger('no-logger', 'no-service')

    // Then
    expect(() => logger.debug()).not.toThrowError()
    expect(() => logger.error()).not.toThrowError()
    expect(() => logger.info()).not.toThrowError()
    expect(() => logger.warn()).not.toThrowError()
})
