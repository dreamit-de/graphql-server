import {
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MetricsClient,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    VALIDATION_ERROR,
} from '@dreamit/graphql-server-base'
import {
    initialSchemaWithOnlyDescription,
    NoOpTestLogger,
    returnErrorQuery,
    userQuery,
    userSchema,
    userSchemaResolvers,
    usersQuery,
} from '@dreamit/graphql-testing'
import { GraphQLError, NoSchemaIntrospectionCustomRule } from 'graphql'
import {
    defaultGraphQLServerOptions,
    GraphQLServer,
    GraphQLServerOptions,
    NoMetricsClient,
    SimpleMetricsClient,
} from 'src'
import { expect, test } from 'vitest'

const customGraphQLServer = new GraphQLServer(
    getInitialGraphQLServerOptions(new NoMetricsClient()),
)
let metricsData: string

test('Should get correct metrics for SimpleMetricsClient', async () => {
    const metricsClient = new SimpleMetricsClient()
    customGraphQLServer.setMetricsClient(metricsClient)
    await runMetricsTest(metricsClient, false)
})

test('SimpleMetricsClient does not increase errors for unknown label', () => {
    const metricsClient = new SimpleMetricsClient()
    metricsClient.increaseErrors('unknownLabel')
    expect(metricsClient.getErrorCount('unknownLabel')).toBe(
        'graphql_server_errors{errorClass="unknownLabel"} undefined',
    )
})

test('Should get no metrics for NoMetricsClient', async () => {
    const metricsClient = new NoMetricsClient()
    customGraphQLServer.setMetricsClient(metricsClient)
    await runMetricsTest(metricsClient, true)
})

async function runMetricsTest(
    metricsClient: MetricsClient,
    isNoMetricsClient: boolean,
): Promise<void> {
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
    metricsData = await customGraphQLServer.getMetrics()
    const metricsContentType = customGraphQLServer.getMetricsContentType()
    if (isNoMetricsClient) {
        expect(metricsContentType).toBe('')
        expect(metricsData).toBe('')
    } else {
        expect(metricsContentType).toBe(
            'text/plain; charset=utf-8; version=0.0.4',
        )
        expect(metricsData).toContain('graphql_server_availability 1')
        expect(metricsData).toContain('graphql_server_request_throughput 0')
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`,
        )
    }
}

/**
 * Test:
 * When schema is invalid, availability should be 0. As only metrics endpoint
 * is being called, request_throughput should stay at 0,
 * SchemaValidationError should increase to 1 and GraphQLError counter should stay at 0
 */
async function testInvalidSchemaMetrics(
    metricsClient: MetricsClient,
    isNoMetricsClient: boolean,
): Promise<void> {
    customGraphQLServer.setOptions({
        logger: NoOpTestLogger,
        metricsClient: metricsClient,
        rootValue: userSchemaResolvers,
        schema: initialSchemaWithOnlyDescription,
        shouldUpdateSchemaFunction: () => true,
    })
    metricsData = await customGraphQLServer.getMetrics()

    if (isNoMetricsClient) {
        expect(metricsData).toBe('')
    } else {
        expect(metricsData).toContain('graphql_server_availability 0')
        expect(metricsData).toContain('graphql_server_request_throughput 0')
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`,
        )
    }
    customGraphQLServer.setOptions(
        getInitialGraphQLServerOptions(metricsClient),
    )
}

/**
 * Test:
 * With working schema, availability should be 1.
 * When sending request with valid data response,
 * request_throughput should increase to 1.
 */
async function testValidResponseMetrics(
    isNoMetricsClient: boolean,
): Promise<void> {
    await customGraphQLServer.handleRequest({
        query: usersQuery,
    })
    metricsData = await customGraphQLServer.getMetrics()

    if (isNoMetricsClient) {
        expect(metricsData).toBe('')
    } else {
        expect(metricsData).toContain('graphql_server_availability 1')
        expect(metricsData).toContain('graphql_server_request_throughput 1')
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`,
        )
    }
}

/**
 * Test:
 * When sending request that returns GraphQL error,
 * GraphQLError counter and request throughput should increase by 1
 */
async function testErrorResponseMetrics(
    isNoMetricsClient: boolean,
): Promise<void> {
    await customGraphQLServer.handleRequest({
        query: returnErrorQuery,
    })
    metricsData = await customGraphQLServer.getMetrics()

    if (isNoMetricsClient) {
        expect(metricsData).toBe('')
    } else {
        expect(metricsData).toContain('graphql_server_availability 1')
        expect(metricsData).toContain('graphql_server_request_throughput 2')
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 1`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`,
        )
    }
}

/**
 * Test:
 * When sending request with empty content type GraphQL error,
 * GraphQLError counter and request throughput should increase by 1
 */
async function testEmptyContentResponseMetrics(
    isNoMetricsClient: boolean,
): Promise<void> {
    await customGraphQLServer.handleRequest({
        body: '{"query":"unknown"}',
        headers: { 'content-type': '' },
        method: 'POST',
    })

    metricsData = await customGraphQLServer.getMetrics()

    if (isNoMetricsClient) {
        expect(metricsData).toBe('')
    } else {
        expect(metricsData).toContain('graphql_server_availability 1')
        expect(metricsData).toContain('graphql_server_request_throughput 3')
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 2`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${FETCH_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`,
        )
    }
}

/**
 * Test:
 * When forcing a FetchError in execute function,
 * FetchError counter and request throughput should increase by 1
 */
async function testFetchErrorResponseMetrics(
    metricsClient: MetricsClient,
    isNoMetricsClient: boolean,
): Promise<void> {
    customGraphQLServer.setOptions({
        executeFunction: () => {
            throw new GraphQLError(
                'FetchError: ' +
                    'An error occurred while connecting to following endpoint',
                {},
            )
        },
        logger: NoOpTestLogger,
        metricsClient: metricsClient,
        rootValue: userSchemaResolvers,
        schema: userSchema,
    })

    await customGraphQLServer.handleRequest({
        query: userQuery,
    })
    metricsData = await customGraphQLServer.getMetrics()

    if (isNoMetricsClient) {
        expect(metricsData).toBe('')
    } else {
        expect(metricsData).toContain('graphql_server_availability 1')
        expect(metricsData).toContain('graphql_server_request_throughput 4')
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${GRAPHQL_ERROR}"} 2`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SCHEMA_VALIDATION_ERROR}"} 1`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${FETCH_ERROR}"} 1`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${METHOD_NOT_ALLOWED_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${INVALID_SCHEMA_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${MISSING_QUERY_PARAMETER_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${VALIDATION_ERROR}"} 0`,
        )
        expect(metricsData).toContain(
            `graphql_server_errors{errorClass="${SYNTAX_ERROR}"} 0`,
        )
    }
    customGraphQLServer.setOptions(
        getInitialGraphQLServerOptions(metricsClient),
    )
}

function getInitialGraphQLServerOptions(
    metricsClient: MetricsClient,
): GraphQLServerOptions {
    return {
        ...defaultGraphQLServerOptions,
        customValidationRules: [NoSchemaIntrospectionCustomRule],
        logger: NoOpTestLogger,
        metricsClient: metricsClient,
        rootValue: userSchemaResolvers,
        schema: userSchema,
    }
}
