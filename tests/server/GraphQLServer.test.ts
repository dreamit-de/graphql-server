import {GraphQLSchema} from 'graphql'
import {GraphQLServer} from '../../src'
import {
    initialSchemaWithOnlyDescription,
    userRequest,
    userRequestWithoutOperationName,
    userRequestWithoutVariables
} from '../ExampleSchemas';
import {generateGetParamsFromGraphQLRequestInfo} from '../TestHelpers';

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription})
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should update schema when calling GraphQLServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription, debug: true})
    const updatedSchema = new GraphQLSchema({description:'updated'})
    graphqlServer.setSchema(updatedSchema)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('updated')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should not update schema when given schema is undefined', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription, debug: true})
    graphqlServer.setSchema(undefined)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

describe('Test that request information is extracted correctly from url parameters', () => {
    test.each`
    request                             | expectedQuery                             | expectedVariables                                             | expectedOperationName
    ${userRequest}                      | ${userRequest.query}                      | ${JSON.stringify(userRequest.variables)}                      | ${userRequest.operationName}  
    ${userRequestWithoutOperationName}  | ${userRequestWithoutOperationName.query}  | ${JSON.stringify(userRequestWithoutOperationName.variables)}  | ${userRequestWithoutOperationName.operationName} 
    ${userRequestWithoutVariables}      | ${userRequestWithoutVariables.query}      | ${userRequestWithoutVariables.variables}                      | ${userRequestWithoutVariables.operationName}  
    `('expects for request $request to extract values correctly', async ({request, expectedQuery, expectedVariables, expectedOperationName}) => {
        const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription, debug: true})
        const requestUrl = `http://doesnotmatter.com/graphql?${generateGetParamsFromGraphQLRequestInfo(request)}`
        const result = graphqlServer.extractInformationFromUrlParameters(requestUrl)
        expect(result.query).toBe(expectedQuery)
        expect(result.variables).toBe(expectedVariables)
        expect(result.operationName).toBe(expectedOperationName)
    });
});
function expectRootQueryNotDefined(graphqlServer: GraphQLServer): void {
    const schemaValidationErrors = graphqlServer.getSchemaValidationErrors()
    expect(schemaValidationErrors?.length).toBe(1)
    expect(schemaValidationErrors?.[0].message).toBe('Query root type must be provided.')
}
