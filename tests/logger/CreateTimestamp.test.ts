/* eslint-disable deprecation/deprecation */
import { createISOTimestamp, createTimestamp } from 'src'
import { testDateFunction, testDateString } from '@dreamit/funpara'
import { expect, test } from 'vitest'

test('CreateTimestamp should create timestamp in ISO format', () => {
    expect(createTimestamp()).toBeTruthy()
    expect(createTimestamp(new Date('2022-02-01T00:00:00.000Z'))).toBe(
        '2022-02-01T00:00:00.000Z',
    )
})

test('CreateISOTimestamp should create timestamp in ISO format', () => {
    expect(createISOTimestamp()).toBeTruthy()
    expect(createISOTimestamp(testDateFunction)).toBe(testDateString)
})
