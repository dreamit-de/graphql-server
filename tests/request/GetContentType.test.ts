import { getContentType } from 'src'
import { expect, test } from 'vitest'

test.each`
    contentTypeAsString                    | expectedContentType
    ${undefined}                           | ${''}
    ${'application/graphql'}               | ${'application/graphql'}
    ${'application/json'}                  | ${'application/json'}
    ${'application/x-www-form-urlencoded'} | ${'application/x-www-form-urlencoded'}
    ${'application/unknown'}               | ${''}
`(
    'Should get correct content type for given value $contentTypeAsString',
    ({ contentTypeAsString, expectedContentType }) => {
        expect(getContentType(contentTypeAsString)).toBe(expectedContentType)
    },
)
