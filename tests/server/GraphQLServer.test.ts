import { GraphQLExecutionResult } from '@dreamit/graphql-server-base'
import { GraphQLError, GraphQLSchema, parse, validate } from 'graphql'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
    GraphQLServer,
    SimpleMetricsClient,
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultMethodNotAllowedResponse,
    defaultOnlyQueryInGetRequestsResponse,
    extractInformationFromRequest,
} from '~/src'
import { TEXT_LOGGER } from '~/tests/TestHelpers'
import {
    initialSchemaWithOnlyDescription,
    returnErrorQuery,
    userOne,
    userSchema,
    userSchemaResolvers,
    userTwo,
    usersQuery,
} from '../ExampleSchemas'

const graphQLErrorResponse: GraphQLExecutionResult = {
    executionResult: {
        errors: [new GraphQLError('doesnotmatter', {})],
    },
}

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer({
        invalidSchemaResponse: graphQLErrorResponse,
        logger: TEXT_LOGGER,
        methodNotAllowedResponse: defaultMethodNotAllowedResponse,
        missingQueryParameterResponse: (): GraphQLExecutionResult =>
            graphQLErrorResponse,
        onlyQueryInGetRequestsResponse: defaultOnlyQueryInGetRequestsResponse,
        schema: initialSchemaWithOnlyDescription,
    })
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should update schema when calling GraphQLServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer({
        logger: TEXT_LOGGER,
        schema: initialSchemaWithOnlyDescription,
    })
    const updatedSchema = new GraphQLSchema({ description: 'updated' })
    graphqlServer.setSchema(updatedSchema)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('updated')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should not update schema when given schema is undefined', () => {
    const graphqlServer = new GraphQLServer({
        logger: TEXT_LOGGER,
        schema: initialSchemaWithOnlyDescription,
    })
    graphqlServer.setSchema()
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test(
    'Should update schema when given schema is undefined ' +
        'and shouldUpdateSchemaFunction is true',
    () => {
        const graphqlServer = new GraphQLServer({
            logger: TEXT_LOGGER,
            schema: initialSchemaWithOnlyDescription,
            shouldUpdateSchemaFunction: (): boolean => true,
        })
        graphqlServer.setSchema()
        const schema = graphqlServer.getSchema()
        expect(schema).toBeUndefined()
    },
)

test('Should execute query without server', async () => {
    const graphqlServer = new GraphQLServer({
        collectErrorMetricsFunction: defaultCollectErrorMetrics,
        contextFunction: defaultContextFunction,
        extractInformationFromRequest: extractInformationFromRequest,
        logger: TEXT_LOGGER,
        metricsClient: new SimpleMetricsClient(),
        parseFunction: parse,
        rootValue: userSchemaResolvers,
        schema: userSchema,
        validateFunction: validate,
    })
    const result = await graphqlServer.handleRequest({
        query: usersQuery,
    })
    expect(result.executionResult.data?.users).toEqual([userOne, userTwo])
    expect(result.statusCode).toBe(200)
    expect(result.requestInformation?.query).toBe(usersQuery)
})

describe('Test using custom error messages', () => {
    const graphqlServer = new GraphQLServer({
        executionResultErrorMessage: 'Error:',
        logger: TEXT_LOGGER,
        metricsClient: new SimpleMetricsClient(),
        rootValue: userSchemaResolvers,
        schema: userSchema,
        validationErrorMessage: 'ValidationError:',
    })
    beforeEach(() => {
        vi.spyOn(TEXT_LOGGER, 'prepareLogOutput')
            // We return only the message here so it can be asserted in the tests
            .mockImplementation((logEntry) => logEntry.message)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('Should receive correct error message if response contains a GraphQLError', async () => {
        await graphqlServer.handleRequest({
            query: returnErrorQuery,
        })
        expect(TEXT_LOGGER.prepareLogOutput).toHaveBeenCalledTimes(1)
        expect(TEXT_LOGGER.prepareLogOutput).toHaveLastReturnedWith(
            'Error: Something went wrong!',
        )
    })

    test('Should receive correct error message if request validation fails', async () => {
        await graphqlServer.handleRequest({
            query: 'query users{ users { unknownField } }',
        })
        expect(TEXT_LOGGER.prepareLogOutput).toHaveBeenCalledTimes(1)
        expect(TEXT_LOGGER.prepareLogOutput).toHaveLastReturnedWith(
            'ValidationError: Cannot query field "unknownField" on type "User".',
        )
    })
})

test('Should use SimpleMetricsClient as fallback if cpuUsage is not available', async () => {
    const savedProcess = process

    // eslint-disable-next-line no-global-assign
    process = {} as NodeJS.Process
    // Necessary for Jest to measure/evaluate test performance
    process.hrtime = savedProcess.hrtime

    const graphqlServer = new GraphQLServer({
        rootValue: userSchemaResolvers,
        schema: userSchema,
    })
    const metrics = await graphqlServer.getMetrics()
    expect(metrics).toContain('graphql_server_availability 1')
    expect(metrics).not.toContain('process_cpu_seconds_total 0')

    // eslint-disable-next-line no-global-assign
    process = savedProcess
})

test(
    'Usage of a second GraphQLServer with MetricsClient that does not use prom-client' +
        ' should not intervene with metrics collection of first server',
    async () => {
        const graphqlServerMain = new GraphQLServer({
            logger: TEXT_LOGGER,
            rootValue: userSchemaResolvers,
            schema: userSchema,
        })

        // Execute request on main server twice to get throughput count of 2
        await graphqlServerMain.handleRequest({
            query: usersQuery,
        })
        await graphqlServerMain.handleRequest({
            query: usersQuery,
        })
        let metrics = await graphqlServerMain.getMetrics()
        expect(metrics).toContain('graphql_server_request_throughput 2')

        const graphqlServerSecond = new GraphQLServer({
            logger: TEXT_LOGGER,
            metricsClient: new SimpleMetricsClient(),
            rootValue: userSchemaResolvers,
            schema: userSchema,
        })

        // Execute request on second server once to get throughput count of 1
        await graphqlServerSecond.handleRequest({
            query: usersQuery,
        })
        metrics = await graphqlServerSecond.getMetrics()
        expect(metrics).toContain('graphql_server_request_throughput 1')

        // Metrics on main server should still have throughput count of 2
        metrics = await graphqlServerMain.getMetrics()
        expect(metrics).toContain('graphql_server_request_throughput 2')
    },
)

test('Should set only default options if no options are provided', async () => {
    const graphqlServer = new GraphQLServer()
    const metrics = await graphqlServer.getMetrics()
    expect(metrics).toContain('graphql_server_availability 0')
})

function expectRootQueryNotDefined(graphqlServer: GraphQLServer): void {
    const schemaValidationErrors = graphqlServer.getSchemaValidationErrors()
    expect(schemaValidationErrors?.length).toBe(1)
    expect(schemaValidationErrors?.[0].message).toBe(
        'Query root type must be provided.',
    )
}
