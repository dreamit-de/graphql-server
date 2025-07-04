/* eslint-disable max-len */
import {
    generateGetParametersFromGraphQLRequestInfo,
    JsonContentTypeHeader,
    usersRequest,
    usersRequestWithoutOperationName,
    usersRequestWithoutVariables,
} from '@dreamit/graphql-testing'
import { fc, test as propertyTest } from '@fast-check/vitest'
import {
    extractInformationFromBody,
    extractInformationFromRequest,
    extractInformationFromUrlParameters,
} from 'src'
import { describe, expect, test } from 'vitest'

describe('Test that request information is extracted correctly from url parameters', () => {
    test.each`
        request                             | expectedQuery                             | expectedVariables                                             | expectedOperationName
        ${usersRequest}                     | ${usersRequest.query}                     | ${JSON.stringify(usersRequest.variables)}                     | ${usersRequest.operationName}
        ${usersRequestWithoutOperationName} | ${usersRequestWithoutOperationName.query} | ${JSON.stringify(usersRequestWithoutOperationName.variables)} | ${usersRequestWithoutOperationName.operationName}
        ${usersRequestWithoutVariables}     | ${usersRequestWithoutVariables.query}     | ${usersRequestWithoutVariables.variables}                     | ${usersRequestWithoutVariables.operationName}
    `(
        'expects for request $request to extract values correctly',
        ({
            request,
            expectedQuery,
            expectedVariables,
            expectedOperationName,
        }) => {
            const requestUrl = `http://doesnotmatter.com/graphql?${generateGetParametersFromGraphQLRequestInfo(request)}`
            const result = extractInformationFromUrlParameters(requestUrl)
            expect(result.query).toBe(expectedQuery)
            expect(result.variables).toBe(expectedVariables)
            expect(result.operationName).toBe(expectedOperationName)
        },
    )
})

test('Get fitting error if body type contains invalid type', async () => {
    const request = {
        body: true,
        headers: {},
        method: 'POST',
        url: 'doesnotmatter',
    }
    const response = await extractInformationFromBody(request)
    expect(response.error?.graphQLError.message).toBe(
        'POST body contains invalid type boolean. Only "object" and "string" are supported.',
    )
})

test('Get fitting error if body is empty', async () => {
    const request = {
        body: undefined,
        headers: {},
        method: 'POST',
        url: 'doesnotmatter',
    }
    const response = await extractInformationFromBody(request)
    expect(response.error?.graphQLError.message).toBe('POST body is empty.')
})

test('Get fitting error if body contains a Buffer', async () => {
    const request = {
        body: Buffer.alloc(3),
        headers: {},
        url: 'doesnotmatter',
    }
    const response = await extractInformationFromBody(request)
    expect(response.error?.graphQLError.message).toBe(
        'Cannot extract information from body because it contains an object buffer!',
    )
})

test('Should properly extract variables from url', async () => {
    const request = {
        body: { query: 'doesnotmatter' },
        headers: JsonContentTypeHeader,
        url: '/graphql?query=mutation&variables=findme',
    }
    const response = await extractInformationFromRequest(request)
    expect(response.variables).toBe('findme')
})

test('Should properly extract query from body for graphql request', async () => {
    const request = {
        body: { query: 'findTheQuery' },
        headers: {
            'content-type': 'application/graphql',
        },
        url: 'pengpeng',
    }
    const response = await extractInformationFromRequest(request)
    expect(response.query).toBe('{"query":"findTheQuery"}')
})

test('Should read body even if url is not set', async () => {
    const request = {
        body: { query: 'findTheQuery' },
        headers: {
            'content-type': 'application/graphql',
        },
    }
    const response = await extractInformationFromRequest(request)
    expect(response.query).toBe('{"query":"findTheQuery"}')
})

test('Should extract body with request.text if body is undefined', async () => {
    const request = {
        headers: {
            'content-type': 'application/graphql',
        },
        text: async (): Promise<string> => {
            return JSON.stringify({ query: 'findTheQuery' })
        },
    }
    const response = await extractInformationFromRequest(request)
    expect(response.query).toBe('{"query":"findTheQuery"}')
})

test('Should not throw an error if body is undefined', async () => {
    const request = {
        body: undefined,
        headers: JsonContentTypeHeader,
    }
    const response = await extractInformationFromRequest(request)
    expect(response.query).toBeUndefined()
})

propertyTest.prop([fc.string()])(
    'should extract any given query from request',
    async (queryToTest) => {
        const request = {
            body: { query: queryToTest },
            headers: JsonContentTypeHeader,
        }
        const response = await extractInformationFromRequest(request)
        return response.query === queryToTest
    },
)

propertyTest.prop([fc.jsonValue()])(
    'should not throw an error if body json is invalid',
    async (bodyToTest) => {
        const request = {
            body: bodyToTest,
            headers: JsonContentTypeHeader,
        }
        await extractInformationFromRequest(request)
        // If an error is thrown the test will fail
        return true
    },
)
