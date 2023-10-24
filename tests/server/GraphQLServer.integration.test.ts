/* eslint-disable @typescript-eslint/naming-convention */
import {
    GRAPHQL_SERVER_PORT,
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    LOGGER,
    fetchResponse,
    generateGetParametersFromGraphQLRequestInfo
} from '../TestHelpers'
import {
    GraphQLError,
    NoSchemaIntrospectionCustomRule
} from 'graphql'
import express, {Express} from 'express'
import {
    introspectionQuery,
    loginRequest,
    logoutMutation,
    multipleErrorResponse,
    returnErrorQuery,
    userOne,
    userQuery,
    userSchema,
    userSchemaResolvers,
    userTwo,
    userVariables,
    usersQuery,
    usersQueryWithUnknownField,
    usersRequest,
} from '../ExampleSchemas'
import {GraphQLServer} from '~/src'
import {Server} from 'node:http'
import bodyParser from 'body-parser'
import fetch from 'cross-fetch'

let customGraphQLServer: GraphQLServer
let graphQLServer: Server
const extensionTestData : Record<string, string> = {
    'hello': 'world'
}

function testFormatErrorFunction(error: GraphQLError): GraphQLError {
    error.message = 'Formatted: ' + error.message
    return error
}

beforeAll(() => {
    graphQLServer = setupGraphQLServer().listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)
})

afterAll(() => {
    graphQLServer.close()
})

test('Should get data response', async() => {
    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.data.users).toStrictEqual([userOne, userTwo])
    expect(responseObject.extensions).toBeUndefined()
})

test('Should get data response for query with variables', async() => {
    const response = await fetchResponse(`{"query":"${userQuery}", "variables":${userVariables}}`)
    const responseObject = await response.json()
    expect(responseObject.data.user).toStrictEqual(userOne)
})

test('Should get data response when using a mutation', async() => {
    const response = await fetchResponse(`{"query":"${logoutMutation}"}`)
    const responseObject = await response.json()
    expect(responseObject.data.logout.result).toBe('Goodbye!')
})

test('Should get error response if query does not match expected query format', async() => {
    const response = await fetchResponse('{"query":"unknown"}')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Syntax Error: Unexpected Name "unknown".')
})

test('Should get error response if body does not contain query information', async() => {
    const response = await fetchResponse('{"aField":"aValue"}')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Request cannot be processed. No query was found in parameters or body. ' + 
        'Used method is POST'
    )
})

test('Should get error response if body contains invalid json', async() => {
    const response = await fetchResponse('{"query":{"unknown"}')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('POST body contains invalid JSON.')
})

test('Should get error response if content type cannot be processed', async() => {
    const response = await fetchResponse('{"query":{"unknown"}', 'POST',{
        'Connection': 'close',
        'Content-Type': 'application/specialapp'
    })
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'POST body contains invalid content type: application/specialapp.'
    )
})

test('Should get filtered error response if a validation error occurs ', async() => {
    const response = await fetchResponse('{"query":"query users{ users { userIdABC userName } }"}')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Cannot query field "userIdABC" on type "User". ')
})

test('Should get unfiltered error response if a' +
    ' validation error occurs and removeValidationRecommendations is enabled', async() => {
    customGraphQLServer.setOptions({
        logger: LOGGER,
        removeValidationRecommendations: false,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse('{"query":"query users{ users { userIdABC userName } }"}')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Cannot query field "userIdABC" on type "User". Did you mean "userId" or "userName"?'
    )
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if content type is not set', async() => {
    const response = await fetchResponse('{"query":"unknown"}', 'POST',{
        'Connection': 'close',
        'Content-Type': ''
    })
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('POST body contains invalid content type: .')
})

test('Should get error response when GraphQL context error' +
    ' occurs when calling execute function', async() => {
    // Change options to let executeFunction return an error
    customGraphQLServer.setOptions({
        executeFunction: () => {
            throw new GraphQLError('A GraphQL context error occurred!', {})
        },
        logger: LOGGER,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('A GraphQL context error occurred!')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if resolver returns GraphQL error', async() => {
    const response = await fetchResponse(`{"query":"${returnErrorQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Something went wrong!')
})


test('Should get error response with formatted error results ' +
    'if resolver returns GraphQL error and formatError function is defined', async() => {
    customGraphQLServer.setOptions({
        formatErrorFunction: testFormatErrorFunction,
        logger: LOGGER,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${returnErrorQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Formatted: Something went wrong!')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get data response when using GET request', async() => {
    const response = await fetch(
        `http://localhost:${GRAPHQL_SERVER_PORT}/graphql?` +
        generateGetParametersFromGraphQLRequestInfo(usersRequest)
    )
    const responseObject = await response.json()
    expect(responseObject.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get error response when using mutation in a GET request', async() => {
    const response = await fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/graphql?` +
    generateGetParametersFromGraphQLRequestInfo(loginRequest))
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Only "query" operation is allowed in "GET" requests. Got: "mutation"'
    )
})

test('Should get an error response when content type is not defined', async() => {
    const response = await fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/graphql`, {
        method: 'POST',
    })
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Invalid request. Request header content-type is undefined.'
    )
})

test('Should get an error response when no query parameter is found', async() => {
    const response = await fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/graphql?aField=aValue`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Request cannot be processed. No query was found in parameters or body. ' + 
        'Used method is GET'
    )
})

test('Should get data response when using urlencoded request', async() => {
    const response = await fetchResponse(generateGetParametersFromGraphQLRequestInfo(usersRequest),
        'POST',
        {
            'Connection': 'close',
            'Content-Type': 'application/x-www-form-urlencoded'
        })
    const responseObject = await response.json()
    expect(responseObject.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get error response when using urlencoded request with no query provided', async() => {
    const response = await fetchResponse('{"unknown":"unknown"}', 'POST',{
        'Connection': 'close',
        'Content-Type': 'application/x-www-form-urlencoded'
    })
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Request cannot be processed. No query was found in parameters or body. ' + 
        'Used method is POST'
    )
})

test('Should get data response for application graphql request', async() => {
    const response = await fetchResponse(usersQuery, 'POST',{
        'Connection': 'close',
        'Content-Type': 'application/graphql'
    })
    const responseObject = await response.json()
    expect(responseObject.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get error response if invalid schema is used', async() => {
    // Change options to use schema validation function that always returns a validation error
    customGraphQLServer.setOptions({
        logger: LOGGER,
        rootValue: userSchemaResolvers,
        schema: userSchema,
        schemaValidationFunction: () => [new GraphQLError('Schema is not valid!', {})]
    })
    const response = await fetchResponse('doesnotmatter')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Request cannot be processed. Schema in GraphQL server is invalid.'
    )
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if invalid method is used', async() => {
    const response = await fetchResponse('doesnotmatter', 'PUT')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'GraphQL server only supports GET and POST requests. Got PUT'
    )
    const allowResponseHeader = response.headers.get('Allow')
    expect(allowResponseHeader).toBe('GET, POST')
})

test('Should get extensions in GraphQL response if extension function is defined ', async() => {
    customGraphQLServer.setOptions({
        extensionFunction: () => extensionTestData,
        logger: LOGGER,
        removeValidationRecommendations: true,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.data.users).toStrictEqual([userOne, userTwo])
    expect(responseObject.extensions).toStrictEqual(extensionTestData)
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get data response if introspection' +
    ' is requested when introspection is allowed', async() => {
    const response = await fetchResponse(`{"query":"${introspectionQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.data.__schema.queryType.name).toBe('Query')
})

test('Should get error response if introspection is requested ' +
    'when validation rule NoSchemaIntrospectionCustomRule is set', async() => {
    customGraphQLServer.setOptions({
        customValidationRules: [NoSchemaIntrospectionCustomRule],
        logger: LOGGER,
        removeValidationRecommendations: true,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${introspectionQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'GraphQL introspection has been disabled, ' +
        'but the requested query contained the field "__schema".'
    )
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if query with unknown field is executed ' +
    'and custom validation rule is set', async() => {
    customGraphQLServer.setOptions({
        customValidationRules: [NoSchemaIntrospectionCustomRule],
        logger: LOGGER,
        removeValidationRecommendations: true,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${usersQueryWithUnknownField}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Cannot query field "hobby" on type "User".')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if query with unknown field is executed ' +
    'and no custom validation rule is set', async() => {
    customGraphQLServer.setOptions({
        customValidationRules: [],
        logger: LOGGER,
        removeValidationRecommendations: true,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${usersQueryWithUnknownField}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Cannot query field "hobby" on type "User".')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get data response if query with unknown field is executed ' +
    'and validation rules are removed', async() => {
    customGraphQLServer.setOptions({
        customValidationRules: [],
        defaultValidationRules: [],
        logger: LOGGER,
        removeValidationRecommendations: true,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${usersQueryWithUnknownField}"}`)
    const responseObject = await response.json()
    expect(responseObject.data.users).toStrictEqual([userOne, userTwo])
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should not reassign AggregateError to original errors field' +
    ' when reassignAggregateError is disabled', async() => {
    customGraphQLServer.setOptions({
        executeFunction: () => (multipleErrorResponse),
        logger: LOGGER,
        reassignAggregateError: false,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    const response = await fetchResponse(`{"query":"${returnErrorQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('The first error!, The second error!')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
    graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })
    return graphQLServerExpress
}
