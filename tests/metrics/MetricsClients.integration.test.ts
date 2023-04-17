import {
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    MetricsClient,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    VALIDATION_ERROR,
} from '@sgohlke/graphql-server-base'
import {
    GRAPHQL_SERVER_PORT,
    LOGGER,
    fetchResponse
} from '../TestHelpers'
import {
    GraphQLError,
    NoSchemaIntrospectionCustomRule
} from 'graphql'
import {
    GraphQLServer,
    GraphQLServerOptions,
    NoMetricsClient,
    SimpleMetricsClient
} from '~/src'
import express, {Express} from 'express'
import {
    initialSchemaWithOnlyDescription,
    returnErrorQuery,
    userSchema,
    userSchemaResolvers,
    usersQuery
} from '../ExampleSchemas'
import {Server} from 'node:http'
import bodyParser from 'body-parser'
import fetch from 'cross-fetch'

let customGraphQLServer: GraphQLServer
let graphQLServer: Server
let metricsResponseBody: string

beforeAll(() => {
    graphQLServer = setupGraphQLServer().listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)
})

afterAll(() => {
    graphQLServer.close()
})

test('Should get correct metrics for SimpleMetricsClient', async() => {
    const metricsClient = new SimpleMetricsClient()
    customGraphQLServer.setMetricsClient(metricsClient)
    await runMetricsTest(metricsClient, false)
})

test('Should get no metrics for NoMetricsClient', async() => {
    const metricsClient = new NoMetricsClient()
    customGraphQLServer.setMetricsClient(metricsClient)
    await runMetricsTest(metricsClient, true)
})

async function runMetricsTest(metricsClient: MetricsClient,
    isNoMetricsClient: boolean): Promise<void> {

    await testInitialMetrics(isNoMetricsClient)
    await testInvalidSchemaMetrics(metricsClient, isNoMetricsClient)
    await testValidResponseMetrics(isNoMetricsClient)
    await testErrorResponseMetrics(isNoMetricsClient)
    await testEmptyContentResponseMetrics(isNoMetricsClient)
    await testFetchErrorResponseMetrics(metricsClient, isNoMetricsClient)
}

/**
 * Test:
 * When called before anything else availability should be 1 and the rest
 * of the counters and gauges should be 0
 */
async function testInitialMetrics(isNoMetricsClient: boolean): Promise<void> {
    metricsResponseBody = await getMetricsResponse()
    if (isNoMetricsClient) {
        expect(metricsResponseBody).toBe('')
    } else {
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
    }
}

/**
 * Test:
 * When schema is invalid, availability should be 0. As only metrics endpoint
 * is being called, request_throughput should stay at 0,
 * SchemaValidationError should increase to 1 and GraphQLError counter should stay at 0
 */
async function testInvalidSchemaMetrics(metricsClient: MetricsClient,
    isNoMetricsClient: boolean): Promise<void> {
    customGraphQLServer.setOptions({
        logger: LOGGER,
        metricsClient: metricsClient,
        rootValue: userSchemaResolvers,
        schema: initialSchemaWithOnlyDescription,
        shouldUpdateSchemaFunction: () => true
    })
    metricsResponseBody = await getMetricsResponse()

    if (isNoMetricsClient) {
        expect(metricsResponseBody).toBe('')
    } else {
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
    }
    customGraphQLServer.setOptions(getInitialGraphQLServerOptions(metricsClient))
}

/**
 * Test:
 * With working schema, availability should be 1.
 * When sending request with valid data response,
 * request_throughput should increase to 1.
 */
async function testValidResponseMetrics(isNoMetricsClient: boolean): Promise<void> {

    await fetchResponse(`{"query":"${usersQuery}"}`)
    metricsResponseBody = await getMetricsResponse()

    if (isNoMetricsClient) {
        expect(metricsResponseBody).toBe('')
    } else {
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
    }
}

/**
 * Test:
 * When sending request that returns GraphQL error,
 * GraphQLError counter and request throughput should increase by 1
 */
async function testErrorResponseMetrics(isNoMetricsClient: boolean): Promise<void> {
    await fetchResponse(`{"query":"${returnErrorQuery}"}`)
    metricsResponseBody = await getMetricsResponse()

    if (isNoMetricsClient) {
        expect(metricsResponseBody).toBe('')
    } else {
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
    }
}

/**
 * Test:
 * When sending request with empty content type GraphQL error,
 * GraphQLError counter and request throughput should increase by 1
 */
async function testEmptyContentResponseMetrics(isNoMetricsClient: boolean): Promise<void> {
    await fetchResponse('{"query":"unknown"}', 'POST', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': ''
    })
    metricsResponseBody = await getMetricsResponse()

    if (isNoMetricsClient) {
        expect(metricsResponseBody).toBe('')
    } else {
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
    }
}

/**
 * Test:
 * When forcing a FetchError in execute function,
 * FetchError counter and request throughput should increase by 1
 */
async function testFetchErrorResponseMetrics(metricsClient: MetricsClient,
    isNoMetricsClient: boolean): Promise<void> {

    customGraphQLServer.setOptions({
        executeFunction: () => {
            throw new GraphQLError('FetchError: ' +
                'An error occurred while connecting to following endpoint', {})
        },
        logger: LOGGER,
        metricsClient: metricsClient,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })

    await fetchResponse(`{"query":"${usersQuery}"}`)
    metricsResponseBody = await getMetricsResponse()

    if (isNoMetricsClient) {
        expect(metricsResponseBody).toBe('')
    } else {
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
    }
    customGraphQLServer.setOptions(getInitialGraphQLServerOptions(metricsClient))
}

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(getInitialGraphQLServerOptions(new NoMetricsClient()))
    graphQLServerExpress.use(bodyParser.json())
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })
    graphQLServerExpress.get('/metrics', async(_request, response) => {
        return response.contentType(customGraphQLServer.getMetricsContentType())
        .send(await customGraphQLServer.getMetrics())
    })
    return graphQLServerExpress
}

function getInitialGraphQLServerOptions(metricsClient: MetricsClient): GraphQLServerOptions {
    return {
        customValidationRules: [NoSchemaIntrospectionCustomRule],
        logger: LOGGER,
        metricsClient: metricsClient,
        rootValue: userSchemaResolvers,
        schema: userSchema
    }
}

async function getMetricsResponse(): Promise<string> {
    const metricsResponse = await fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/metrics`)
    return await metricsResponse.text()
}
