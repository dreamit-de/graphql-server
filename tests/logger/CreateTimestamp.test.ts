import { createTimestamp } from '@/index'
import { expect, test } from 'vitest'

test('Should create timestamp in ISO format', () => {
    expect(createTimestamp()).toBeTruthy()
    expect(createTimestamp(new Date('2022-02-01T00:00:00.000Z'))).toBe(
        '2022-02-01T00:00:00.000Z',
    )
})
