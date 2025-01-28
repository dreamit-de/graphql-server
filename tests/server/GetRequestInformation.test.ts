/* eslint-disable max-len */
import { requestForQuery, usersQuery } from '@dreamit/graphql-testing'
import { getRequestInformation } from 'src'
import { expect, test } from 'vitest'

test('Should get Request information when options are not set', () => {
    expect(
        getRequestInformation(requestForQuery(usersQuery), {}, {}),
    ).toStrictEqual({
        error: undefined,
        operationName: undefined,
        query: 'query users{ users { userId userName } }',
        variables: undefined,
    })
})
