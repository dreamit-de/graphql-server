import express, {Express} from 'express'
import {Server} from 'node:http'
import {
    GraphQLServer,
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    VALIDATION_ERROR
} from '../../src/'
import fetch from 'cross-fetch'
import {
    usersQuery,
    returnErrorQuery,
    userSchemaResolvers,
    initialSchemaWithOnlyDescription,
    userSchema
} from '../ExampleSchemas'
import {
    fetchResponse,
    GRAPHQL_SERVER_PORT,
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    LOGGER
} from '../TestHelpers'

import {
    GraphQLError,
    NoSchemaIntrospectionCustomRule
} from 'graphql'


let customGraphQLServer: GraphQLServer
let graphQLServer: Server

beforeAll(async() => {
    graphQLServer = setupGraphQLServer().listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)
})

afterAll(async() => {
    await graphQLServer.close()
})

test('Should get correct metrics', async() => {

    /**
     * Test:
     * When called before anything else availability should be 1 and the rest
     * of the counters and gauges should be 0
     */
    let metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain(
        'graphql_server_availability 1'
    )
    expect(metricsResponseBody).toContain(
        'graphql_server_request_throughput 0'
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`
    )

    /**
     * Test:
     * When schema is invalid, availability should be 0. As only metrics endpoint
     * is being called, request_throughput should stay at 0,
     * SchemaValidationError should increase to 1 and GraphQLError counter should stay at 0
     */
    customGraphQLServer.setOptions({
        schema: initialSchemaWithOnlyDescription,
        rootValue: userSchemaResolvers,
        logger: LOGGER,
        debug: true,
        shouldUpdateSchemaFunction: () => true
    })
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain(
        'graphql_server_availability 0'
    )
    expect(metricsResponseBody).toContain(
        'graphql_server_request_throughput 0'
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`
    )
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)

    /**
     * Test:
     * With working schema, availability should be 1.
     * When sending request with valid data response,
     * request_throughput should increase to 1.
     */
    await fetchResponse(`{"query":"${usersQuery}"}`)
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain(
        'graphql_server_availability 1'
    )
    expect(metricsResponseBody).toContain(
        'graphql_server_request_throughput 1'
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`
    )

    /**
     * Test:
     * When sending request that returns GraphQL error,
     * GraphQLError counter and request throughput should increase by 1
     */
    await fetchResponse(`{"query":"${returnErrorQuery}"}`)
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain(
        'graphql_server_availability 1'
    )
    expect(metricsResponseBody).toContain(
        'graphql_server_request_throughput 2'
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 1`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`
    )

    /**
     * Test:
     * When sending request with empty content type GraphQL error,
     * GraphQLError counter and request throughput should increase by 1
     */
    await fetchResponse('{"query":"unknown"}', 'POST', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': ''
    })
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain(
        'graphql_server_availability 1'
    )
    expect(metricsResponseBody).toContain(
        'graphql_server_request_throughput 3'
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 2`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`
    )

    /**
     * Test:
     * When forcing a FetchError in execute function,
     * FetchError counter and request throughput should increase by 1
     */
    customGraphQLServer.setOptions({
        schema: userSchema,
        rootValue: userSchemaResolvers,
        logger: LOGGER,
        debug: true,
        executeFunction: () => {
            throw new GraphQLError('FetchError: ' +
                'An error occurred while connecting to following endpoint')
        }
    })

    await fetchResponse(`{"query":"${usersQuery}"}`)
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain(
        'graphql_server_availability 1'
    )
    expect(metricsResponseBody).toContain(
        'graphql_server_request_throughput 4'
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 2`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${FETCH_ERROR}"} 1`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`
    )
    expect(metricsResponseBody).toContain(
        `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`
    )
    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(
        {
            schema: userSchema,
            rootValue: userSchemaResolvers,
            logger: LOGGER,
            debug: true,
            customValidationRules: [NoSchemaIntrospectionCustomRule]
        }
    )
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })
    graphQLServerExpress.get('/metrics', async(_request, response) => {
        return response.contentType(customGraphQLServer.getMetricsContentType())
        .send(await customGraphQLServer.getMetrics())
    })
    return graphQLServerExpress
}

async function getMetricsResponse(): Promise<string> {
    const metricsResponse = await fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/metrics`)
    return await metricsResponse.text()
}

