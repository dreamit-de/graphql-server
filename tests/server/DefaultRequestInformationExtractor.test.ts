import {
    usersRequest,
    usersRequestWithoutOperationName,
    usersRequestWithoutVariables
} from '../ExampleSchemas';
import {generateGetParamsFromGraphQLRequestInfo} from '../TestHelpers';
import {DefaultRequestInformationExtractor} from '../../src';

const requestInformationExtractor = new DefaultRequestInformationExtractor()

describe('Test that request information is extracted correctly from url parameters', () => {
    test.each`
    request                              | expectedQuery                              | expectedVariables                                              | expectedOperationName
    ${usersRequest}                      | ${usersRequest.query}                      | ${JSON.stringify(usersRequest.variables)}                      | ${usersRequest.operationName}  
    ${usersRequestWithoutOperationName}  | ${usersRequestWithoutOperationName.query}  | ${JSON.stringify(usersRequestWithoutOperationName.variables)}  | ${usersRequestWithoutOperationName.operationName} 
    ${usersRequestWithoutVariables}      | ${usersRequestWithoutVariables.query}      | ${usersRequestWithoutVariables.variables}                      | ${usersRequestWithoutVariables.operationName}  
    `('expects for request $request to extract values correctly', async ({request, expectedQuery, expectedVariables, expectedOperationName}) => {
        const requestUrl = `http://doesnotmatter.com/graphql?${generateGetParamsFromGraphQLRequestInfo(request)}`
        const result = requestInformationExtractor.extractInformationFromUrlParameters(requestUrl)
        expect(result.query).toBe(expectedQuery)
        expect(result.variables).toBe(expectedVariables)
        expect(result.operationName).toBe(expectedOperationName)
    });
});
