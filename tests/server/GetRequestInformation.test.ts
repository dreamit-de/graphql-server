/* eslint-disable max-len */
import { requestForQuery, usersQuery } from '@dreamit/graphql-testing'
import { defaultGraphQLServerOptions, getRequestInformation } from 'src'
import { expect, test } from 'vitest'

test('Should get Request information when options are not set', async () => {
    expect(
        await getRequestInformation(
            requestForQuery(usersQuery),
            {},
            defaultGraphQLServerOptions,
        ),
    ).toStrictEqual({
        error: undefined,
        operationName: undefined,
        query: 'query users{ users { userId userName } }',
        variables: undefined,
    })
})
