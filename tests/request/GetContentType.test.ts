import { ContentType } from '@dreamit/graphql-server-base'
import { getContentType } from 'src'
import { expect, test } from 'vitest'

test('Should get unknown content type if no content type is provided', () => {
    expect(getContentType()).toBe(ContentType.unknown)
})
