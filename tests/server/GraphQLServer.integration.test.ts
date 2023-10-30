/* eslint-disable @typescript-eslint/naming-convention */
import {
    GraphQLError,
    NoSchemaIntrospectionCustomRule
} from 'graphql'
import {
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    LOGGER,
    StandaloneGraphQLServerResponse,
    generateGetParametersFromGraphQLRequestInfo,
    sendRequest,
    sendRequestWithURL
} from '../TestHelpers'
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

const customGraphQLServer = new GraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
const extensionTestData : Record<string, string> = {
    'hello': 'world'
}

const standaloneGraphQLServerResponse = new StandaloneGraphQLServerResponse()
function testFormatErrorFunction(error: GraphQLError): GraphQLError {
    error.message = 'Formatted: ' + error.message
    return error
}

test('Should get data response', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${usersQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get data response in GraphQLServerResponse when using GraphQLRequestInfo', async() => {
    await customGraphQLServer.handleRequest({
        query: usersQuery
    }, 
    standaloneGraphQLServerResponse)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get data response for query with variables', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${userQuery}", "variables":${userVariables}}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.user).toStrictEqual(userOne)
})

test('Should get data response when using a mutation', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${logoutMutation}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.logout.result).toBe('Goodbye!')
})

test('Should get error response if query does not match expected query format', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"query":"unknown"}')
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('Syntax Error: Unexpected Name "unknown".')
})

test('Should get error response if body does not contain query information', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"aField":"aValue"}')
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'Request cannot be processed. No query was found in parameters or body. ' + 
        'Used method is POST'
    )
})

test('Should get error response if body contains invalid json', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"query":{"unknown"}')
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('POST body contains invalid JSON.')
})

test('Should get error response if content type cannot be processed', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"query":{"unknown"}',
        'POST',
        {
            'connection': 'close',
            'content-type': 'application/specialapp'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'POST body contains invalid content type: application/specialapp.'
    )
})

test('Should get filtered error response if a validation error occurs ', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"query":"query users{ users { userIdABC userName } }"}')
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('Cannot query field "userIdABC" on type "User". ')
})

test('Should get unfiltered error response if a' +
    ' validation error occurs and removeValidationRecommendations is enabled', async() => {
    customGraphQLServer.setOptions({
        logger: LOGGER,
        removeValidationRecommendations: false,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"query":"query users{ users { userIdABC userName } }"}')
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'Cannot query field "userIdABC" on type "User". Did you mean "userId" or "userName"?'
    )
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if content type is not set', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"query":"unknown"}',
        'POST',
        {
            'connection': 'close',
            'content-type': ''
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('POST body contains invalid content type: .')
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
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${usersQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('A GraphQL context error occurred!')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if resolver returns GraphQL error', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${returnErrorQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('Something went wrong!')
})

test('Should get error response with formatted error results ' +
    'if resolver returns GraphQL error and formatError function is defined', async() => {
    customGraphQLServer.setOptions({
        formatErrorFunction: testFormatErrorFunction,
        logger: LOGGER,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${returnErrorQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('Formatted: Something went wrong!')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get data response when using GET request', async() => {
    await sendRequestWithURL(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        'http://localhost:3000/graphql?' +
        generateGetParametersFromGraphQLRequestInfo(usersRequest),
        {
            'connection': 'close',
            'content-type': 'application/json'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get error response when using mutation in a GET request', async() => {
    await sendRequestWithURL(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        'http://localhost:3000/graphql?' +
        generateGetParametersFromGraphQLRequestInfo(loginRequest), 
        {    
            'connection': 'close',
            'content-type': 'application/json'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'Only "query" operation is allowed in "GET" requests. Got: "mutation"'
    )
})

test('Should get an error response when content type is not defined', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        'doesnotmatter',
        'POST',
        {
            'connection': 'close'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'Invalid request. Request header content-type is undefined.'
    )
})

test('Should get an error response when no query parameter is found', async() => {
    await sendRequestWithURL(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        'http://localhost:3000/graphql?aField=aValue', 
        {
            'connection': 'close',
            'content-type': 'application/json'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'Request cannot be processed. No query was found in parameters or body. ' + 
        'Used method is GET'
    )
})

test('Should get data response when using urlencoded request', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        generateGetParametersFromGraphQLRequestInfo(usersRequest),
        'POST',
        {
            'connection': 'close',
            'content-type': 'application/x-www-form-urlencoded'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get error response when using urlencoded request with no query provided', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        '{"unknown":"unknown"}', 
        'POST',
        {
            'content-type': 'application/x-www-form-urlencoded'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'Request cannot be processed. No query was found in parameters or body. ' + 
        'Used method is POST'
    )
})

test('Should get data response for application graphql request', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        usersQuery,
        'POST',
        {
            'connection': 'close',
            'content-type': 'application/graphql'
        })
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.users).toStrictEqual([userOne, userTwo])
})

test('Should get error response if invalid schema is used', async() => {
    // Change options to use schema validation function that always returns a validation error
    customGraphQLServer.setOptions({
        logger: LOGGER,
        rootValue: userSchemaResolvers,
        schema: userSchema,
        schemaValidationFunction: () => [new GraphQLError('Schema is not valid!', {})]
    })
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        'doesnotmatter')
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'Request cannot be processed. Schema in GraphQL server is invalid.'
    )
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get error response if invalid method is used', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        'doesnotmatter', 
        'PUT')
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
        'GraphQL server only supports GET and POST requests. Got PUT'
    )
    const allowResponseHeader = standaloneGraphQLServerResponse.headers.get('allow')
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
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${usersQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.users).toStrictEqual([userOne, userTwo])
    expect(responseBody.extensions).toStrictEqual(extensionTestData)
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should get data response if introspection' +
    ' is requested when introspection is allowed', async() => {
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${introspectionQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.__schema.queryType.name).toBe('Query')
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
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${introspectionQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe(
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
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${usersQueryWithUnknownField}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('Cannot query field "hobby" on type "User".')
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
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${usersQueryWithUnknownField}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('Cannot query field "hobby" on type "User".')
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
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${usersQueryWithUnknownField}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.data.users).toStrictEqual([userOne, userTwo])
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
    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${returnErrorQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('The first error!, The second error!')
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})
