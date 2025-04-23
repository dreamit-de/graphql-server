import { getContentType } from 'src'
import { expect, test } from 'vitest'

test('Should get correct content type', () => {
    expect(getContentType()).toBe('')
    expect(getContentType('application/graphql')).toBe('application/graphql')
    expect(getContentType('application/json')).toBe('application/json')
    expect(getContentType('application/x-www-form-urlencoded')).toBe(
        'application/x-www-form-urlencoded',
    )
    expect(getContentType('application/unknown')).toBe('')
})
