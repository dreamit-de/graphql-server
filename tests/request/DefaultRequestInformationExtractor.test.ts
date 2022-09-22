/* eslint-disable max-len */
import {
    usersRequest,
    usersRequestWithoutOperationName,
    usersRequestWithoutVariables
} from '../ExampleSchemas'
import {generateGetParametersFromGraphQLRequestInfo} from '../TestHelpers'
import {DefaultRequestInformationExtractor} from '../../src'

const requestInformationExtractor = new DefaultRequestInformationExtractor()

describe('Test that request information is extracted correctly from url parameters', () => {
    test.each`
    request                              | expectedQuery                              | expectedVariables                                              | expectedOperationName
    ${usersRequest}                      | ${usersRequest.query}                      | ${JSON.stringify(usersRequest.variables)}                      | ${usersRequest.operationName}  
    ${usersRequestWithoutOperationName}  | ${usersRequestWithoutOperationName.query}  | ${JSON.stringify(usersRequestWithoutOperationName.variables)}  | ${usersRequestWithoutOperationName.operationName} 
    ${usersRequestWithoutVariables}      | ${usersRequestWithoutVariables.query}      | ${usersRequestWithoutVariables.variables}                      | ${usersRequestWithoutVariables.operationName}  
    `('expects for request $request to extract values correctly', async({request, expectedQuery, expectedVariables, expectedOperationName}) => {
        const requestUrl = `http://doesnotmatter.com/graphql?${generateGetParametersFromGraphQLRequestInfo(request)}`
        const result = requestInformationExtractor.extractInformationFromUrlParameters(requestUrl)
        expect(result.query).toBe(expectedQuery)
        expect(result.variables).toBe(expectedVariables)
        expect(result.operationName).toBe(expectedOperationName)
    })
})

test('Get fitting error if body type contains invalid type', async() => {
    const request = {
        headers: {},
        url: 'doesnotmatter',
        body: true,
        method: 'POST'
    }
    const response = await requestInformationExtractor.extractInformationFromBody(request)
    expect(response.error?.graphQLError.message).toBe('POST body contains invalid type boolean. Only "object" and "string" are supported.')
})

test('Get fitting error if body contains a Buffer', async() => {
    const request = {
        headers: {},
        url: 'doesnotmatter',
        body: Buffer.alloc(3) ,
        method: 'doesnotmatter'
    }
    const response = await requestInformationExtractor.extractInformationFromBody(request)
    expect(response.error?.graphQLError.message).toBe('Cannot extract information from body because it contains an object buffer!')
})

test('Should properly extract variables from url', async() => {
    const request = {
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'content-type': 'application/json'
        },
        url: '/graphql?query=mutation&variables=findme',
        body: { query: 'doesnotmatter'} ,
        method: 'doesnotmatter'
    }
    const response = await requestInformationExtractor.extractInformationFromRequest(request)
    expect(response.variables).toBe('findme')
})

test('Should properly extract query from body for graphql request', async() => {
    const request = {
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'content-type': 'application/graphql'
        },
        url: 'pengpeng',
        body: { query: 'findTheQuery'} ,
        method: 'doesnotmatter'
    }
    const response = await requestInformationExtractor.extractInformationFromRequest(request)
    expect(response.query).toBe('{"query":"findTheQuery"}')
})
