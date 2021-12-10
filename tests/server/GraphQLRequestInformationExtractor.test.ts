import {
    userRequest,
    userRequestWithoutOperationName,
    userRequestWithoutVariables
} from '../ExampleSchemas';
import {generateGetParamsFromGraphQLRequestInfo} from '../TestHelpers';
import {GraphQLRequestInformationExtractor} from '../../src/server/GraphQLRequestInformationExtractor';

const requestInformationExtractor = new GraphQLRequestInformationExtractor()

describe('Test that request information is extracted correctly from url parameters', () => {
    test.each`
    request                             | expectedQuery                             | expectedVariables                                             | expectedOperationName
    ${userRequest}                      | ${userRequest.query}                      | ${JSON.stringify(userRequest.variables)}                      | ${userRequest.operationName}  
    ${userRequestWithoutOperationName}  | ${userRequestWithoutOperationName.query}  | ${JSON.stringify(userRequestWithoutOperationName.variables)}  | ${userRequestWithoutOperationName.operationName} 
    ${userRequestWithoutVariables}      | ${userRequestWithoutVariables.query}      | ${userRequestWithoutVariables.variables}                      | ${userRequestWithoutVariables.operationName}  
    `('expects for request $request to extract values correctly', async ({request, expectedQuery, expectedVariables, expectedOperationName}) => {
        const requestUrl = `http://doesnotmatter.com/graphql?${generateGetParamsFromGraphQLRequestInfo(request)}`
        const result = requestInformationExtractor.extractInformationFromUrlParameters(requestUrl)
        expect(result.query).toBe(expectedQuery)
        expect(result.variables).toBe(expectedVariables)
        expect(result.operationName).toBe(expectedOperationName)
    });
});
