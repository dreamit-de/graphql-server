/* eslint-disable deprecation/deprecation */
import { testDateFunction, testDateString } from '@dreamit/funpara'
import { createISOTimestamp } from 'src'
import { expect, test } from 'vitest'

test('CreateISOTimestamp should create timestamp in ISO format', () => {
    expect(createISOTimestamp()).toBeTruthy()
    expect(createISOTimestamp(testDateFunction)).toBe(testDateString)
})
