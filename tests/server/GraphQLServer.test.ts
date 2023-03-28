import {
    GraphQLError,
    GraphQLSchema,
    parse,
    validate
} from 'graphql'
import {
    defaultCollectErrorMetrics,
    defaultLoggerContextFunction,
    defaultMethodNotAllowedResponse,
    defaultOnlyQueryInGetRequestsResponse,
    defaultRequestContextFunction,
    extractInformationFromRequest,
    GraphQLServer,
    SimpleMetricsClient
} from '~/src'
import {
    initialSchemaWithOnlyDescription,
    userOne,
    userSchema,
    userSchemaResolvers,
    usersQuery,
    userTwo
} from '../ExampleSchemas'
import {TEXT_LOGGER} from '~/tests/TestHelpers'
import {GraphQLExecutionResult} from '@sgohlke/graphql-server-base'

const graphQLErrorResponse: GraphQLExecutionResult = {
    executionResult: {
        errors:
            [new GraphQLError('doesnotmatter', {})]
    },
}

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer({
        logger: TEXT_LOGGER,
        schema: initialSchemaWithOnlyDescription,
        onlyQueryInGetRequestsResponse: defaultOnlyQueryInGetRequestsResponse,
        missingQueryParameterResponse: graphQLErrorResponse,
        invalidSchemaResponse: graphQLErrorResponse,
        methodNotAllowedResponse: defaultMethodNotAllowedResponse
    })
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should update schema when calling GraphQLServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer({
        schema: initialSchemaWithOnlyDescription,
        logger: TEXT_LOGGER
    })
    const updatedSchema = new GraphQLSchema({description:'updated'})
    graphqlServer.setSchema(updatedSchema)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('updated')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should not update schema when given schema is undefined', () => {
    const graphqlServer = new GraphQLServer({
        schema: initialSchemaWithOnlyDescription,
        logger: TEXT_LOGGER
    })
    graphqlServer.setSchema()
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should update schema when given schema is undefined ' +
    'and shouldUpdateSchemaFunction is true', () => {
    const graphqlServer = new GraphQLServer({
        logger: TEXT_LOGGER,
        schema: initialSchemaWithOnlyDescription
        , shouldUpdateSchemaFunction: (): boolean => true
    })
    graphqlServer.setSchema()
    const schema = graphqlServer.getSchema()
    expect(schema).toBeUndefined()
})

test('Should execute query without server', async() => {
    const graphqlServer = new GraphQLServer({
        schema: userSchema,
        rootValue: userSchemaResolvers,
        logger: TEXT_LOGGER,
        extractInformationFromRequest: extractInformationFromRequest,
        metricsClient: new SimpleMetricsClient(),
        collectErrorMetricsFunction: defaultCollectErrorMetrics,
        parseFunction: parse,
        validateFunction: validate,
        requestContextFunction: defaultRequestContextFunction,
        loggerContextFunction: defaultLoggerContextFunction,
    })
    const result = await graphqlServer.executeRequest({
        query: usersQuery
    })
    expect(result.executionResult.data?.users).toEqual([userOne, userTwo])
    expect(result.statusCode).toBe(200)
    expect(result.requestInformation?.query).toBe(usersQuery)
})

test('Should use SimpleMetricsClient as fallback if cpuUsage is not available', async() => {
    const savedProcess = process

    // eslint-disable-next-line no-global-assign
    process = {} as NodeJS.Process
    // Necessary for Jest to measure/evaluate test performance
    process.hrtime = savedProcess.hrtime

    const graphqlServer = new GraphQLServer({
        schema: userSchema,
        rootValue: userSchemaResolvers
    })
    const metrics = await graphqlServer.getMetrics()
    expect(metrics).toContain(
        'graphql_server_availability 1'
    )
    expect(metrics).not.toContain(
        'process_cpu_seconds_total 0'
    )

    // eslint-disable-next-line no-global-assign
    process = savedProcess
})

test('Usage of a second GraphQLServer with MetricsClient that does not use prom-client' +
    ' should not intervene with metrics collection of first server', async() => {
    const graphqlServerMain = new GraphQLServer({
        schema: userSchema,
        rootValue: userSchemaResolvers,
        logger: TEXT_LOGGER,
    })

    // Execute request on main server twice to get throughput count of 2
    await graphqlServerMain.executeRequest({
        query: usersQuery
    })
    await graphqlServerMain.executeRequest({
        query: usersQuery
    })
    let metrics = await graphqlServerMain.getMetrics()
    expect(metrics).toContain(
        'graphql_server_request_throughput 2'
    )

    const graphqlServerSecond = new GraphQLServer({
        schema: userSchema,
        rootValue: userSchemaResolvers,
        logger: TEXT_LOGGER,
        metricsClient: new SimpleMetricsClient()
    })

    // Execute request on second server once to get throughput count of 1
    await graphqlServerSecond.executeRequest({
        query: usersQuery
    })
    metrics = await graphqlServerSecond.getMetrics()
    expect(metrics).toContain(
        'graphql_server_request_throughput 1'
    )

    // Metrics on main server should still have throughput count of 2
    metrics = await graphqlServerMain.getMetrics()
    expect(metrics).toContain(
        'graphql_server_request_throughput 2'
    )
})

test('Should set only default options if no options are provided', async() => {
    const graphqlServer = new GraphQLServer()
    const metrics = await graphqlServer.getMetrics()
    expect(metrics).toContain(
        'graphql_server_availability 0'
    )
})

function expectRootQueryNotDefined(graphqlServer: GraphQLServer): void {
    const schemaValidationErrors = graphqlServer.getSchemaValidationErrors()
    expect(schemaValidationErrors?.length).toBe(1)
    expect(schemaValidationErrors?.[0].message).toBe('Query root type must be provided.')
}
