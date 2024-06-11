/* eslint-disable max-len */
import { describe, expect, test } from 'vitest'
import {
    extractInformationFromBody,
    extractInformationFromRequest,
    extractInformationFromUrlParameters,
} from 'src'
import {
    usersRequest,
    usersRequestWithoutOperationName,
    usersRequestWithoutVariables,
} from '../ExampleSchemas'
import { generateGetParametersFromGraphQLRequestInfo } from '../TestHelpers'

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

test('Get fitting error if body type contains invalid type', () => {
    const request = {
        body: true,
        headers: {},
        method: 'POST',
        url: 'doesnotmatter',
    }
    const response = extractInformationFromBody(request)
    expect(response.error?.graphQLError.message).toBe(
        'POST body contains invalid type boolean. Only "object" and "string" are supported.',
    )
})

test('Get fitting error if body contains a Buffer', () => {
    const request = {
        body: Buffer.alloc(3),
        headers: {},
        url: 'doesnotmatter',
    }
    const response = extractInformationFromBody(request)
    expect(response.error?.graphQLError.message).toBe(
        'Cannot extract information from body because it contains an object buffer!',
    )
})

test('Should properly extract variables from url', () => {
    const request = {
        body: { query: 'doesnotmatter' },
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'content-type': 'application/json',
        },
        url: '/graphql?query=mutation&variables=findme',
    }
    const response = extractInformationFromRequest(request)
    expect(response.variables).toBe('findme')
})

test('Should properly extract query from body for graphql request', () => {
    const request = {
        body: { query: 'findTheQuery' },
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'content-type': 'application/graphql',
        },
        url: 'pengpeng',
    }
    const response = extractInformationFromRequest(request)
    expect(response.query).toBe('{"query":"findTheQuery"}')
})

test('Should read body even if url is not set', () => {
    const request = {
        body: { query: 'findTheQuery' },
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'content-type': 'application/graphql',
        },
    }
    const response = extractInformationFromRequest(request)
    expect(response.query).toBe('{"query":"findTheQuery"}')
})
