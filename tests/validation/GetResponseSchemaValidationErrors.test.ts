import { getResponseSchemaValidationErrors } from 'src'
import { PromiseReturningStandardSchema } from 'tests/TestHelpers'
import { expect, test } from 'vitest'

test('Should throw a TypeError if schema returns a Promise', () => {
    expect(() =>
        getResponseSchemaValidationErrors(
            PromiseReturningStandardSchema,
            'AAA',
        ),
    ).toThrowError('Validation function must be synchronous')
})
