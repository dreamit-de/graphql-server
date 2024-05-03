import { getContentType } from '@/index'
import { ContentType } from '@dreamit/graphql-server-base'
import { expect, test } from 'vitest'

test('Should get unknown content type if no content type is provided', () => {
    expect(getContentType()).toBe(ContentType.unknown)
})
