/* eslint-disable max-len */
import { getRequestInformation } from 'src'
import { usersQuery } from 'tests/ExampleSchemas'
import { JSON_CT_HEADER } from 'tests/TestHelpers'
import { expect, test } from 'vitest'

test('Should get Request information when options are not set', () => {
    expect(
        getRequestInformation(
            {
                headers: JSON_CT_HEADER,
                body: {
                    query: usersQuery,
                },
                method: 'POST',
            },
            {},
            {},
        ),
    ).toStrictEqual({
        error: undefined,
        operationName: undefined,
        query: 'query users{ users { userId userName } }',
        variables: undefined,
    })
})
