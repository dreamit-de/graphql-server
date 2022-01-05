import express, {Express} from 'express'
import {Server} from 'http'
import {GraphQLServer} from '../../src/'
import fetch from 'cross-fetch'
import {
    usersQuery,
    returnErrorQuery,
    userSchemaResolvers,
    initialSchemaWithOnlyDescription
} from '../ExampleSchemas'
import {
    fetchResponse,
    graphQLServerPort,
    initialGraphQLServerOptions,
    logger
} from '../TestHelpers'

let customGraphQLServer: GraphQLServer
let graphQLServer: Server

beforeAll(async () => {
    graphQLServer = setupGraphQLServer().listen({port: graphQLServerPort})
    console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
})

afterAll(async () => {
    await graphQLServer.close()
})

test('Should get correct metrics', async () => {
    /** Test:
     * When called before anything else availability should be 1 and the rest of the counters and gauges should be 0
     */
    let metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain('graphql_server_availability 1')
    expect(metricsResponseBody).toContain('graphql_server_request_throughput 0')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="GraphQLError"} 0')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="SchemaValidationError"} 0')

    /** Test:
     * When schema is invalid, availability should be 0. As only metrics endpoint is being called, request_throughput
     * should stay at 0, SchemaValidationError should increase to 1 and GraphQLError counter should stay at 0
     */
    customGraphQLServer.setOptions({schema: initialSchemaWithOnlyDescription, rootValue: userSchemaResolvers, logger: logger, debug: true,
        shouldUpdateSchemaFunction: () => true})
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain('graphql_server_availability 0')
    expect(metricsResponseBody).toContain('graphql_server_request_throughput 0')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="GraphQLError"} 0')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="SchemaValidationError"} 1')
    customGraphQLServer.setOptions(initialGraphQLServerOptions)

    /** Test:
     * With working schema, availability should be 1. When sending request with valid data response, request_throughput
     * should increase to 1.
     */
    await fetchResponse(`{"query":"${usersQuery}"}`)
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain('graphql_server_availability 1')
    expect(metricsResponseBody).toContain('graphql_server_request_throughput 1')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="GraphQLError"} 0')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="SchemaValidationError"} 1')

    /** Test:
     * When sending request that returns GraphQL error, GraphQLError counter and request throughput should increase by 1
     */
    await fetchResponse(`{"query":"${returnErrorQuery}"}`)
    metricsResponseBody = await getMetricsResponse()
    expect(metricsResponseBody).toContain('graphql_server_availability 1')
    expect(metricsResponseBody).toContain('graphql_server_request_throughput 2')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="GraphQLError"} 1')
    expect(metricsResponseBody).toContain('graphql_server_errors{errorClass="SchemaValidationError"} 1')
})

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(initialGraphQLServerOptions)
    graphQLServerExpress.all('/graphql', (req, res) => {
        return customGraphQLServer.handleRequest(req, res)
    })
    graphQLServerExpress.get('/metrics', async (req, res) => {
        return res.contentType(customGraphQLServer.getMetricsContentType()).send(await customGraphQLServer.getMetrics());
    })
    return graphQLServerExpress
}

async function getMetricsResponse(): Promise<string> {
    const metricsResponse = await fetch(`http://localhost:${graphQLServerPort}/metrics`)
    return await metricsResponse.text()
}

