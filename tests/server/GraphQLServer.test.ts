import type { GraphQLExecutionResult } from '@dreamit/graphql-server-base'
import {
    initialSchemaWithOnlyDescription,
    loginMutation,
    NoOpTestLogger,
    requestForQuery,
    returnErrorQuery,
    StandaloneGraphQLServerResponse,
    userOne,
    userSchema,
    userSchemaResolvers,
    usersQuery,
    userTwo,
} from '@dreamit/graphql-testing'
import { GraphQLError, GraphQLSchema, parse, validate } from 'graphql'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import type { StandaloneResponseParameters } from 'src'
import {
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultMethodNotAllowedResponse,
    defaultOnlyQueryInGetRequestsResponse,
    extractInformationFromRequest,
    GraphQLServer,
    SimpleMetricsClient,
} from 'src'
import { expect, test } from 'vitest'
import { JsonTestLogger } from '../TestHelpers'

const graphQLErrorResponse: GraphQLExecutionResult = {
    executionResult: {
        errors: [new GraphQLError('doesnotmatter', {})],
    },
}

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer({
        invalidSchemaResponse: graphQLErrorResponse,
        logger: NoOpTestLogger,
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
        logger: NoOpTestLogger,
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
    const logger = new JsonTestLogger()
    const graphqlServer = new GraphQLServer({
        logger: logger,
        schema: initialSchemaWithOnlyDescription,
    })
    graphqlServer.setSchema()
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
    const warnLogEntry = logger.logEntries.pop()
    expect(warnLogEntry?.message).toBe(
        'Schema update was rejected because condition set in "shouldUpdateSchema" check was not fulfilled.',
    )
    expect(warnLogEntry?.level).toBe('WARN')
})

test(
    'Should update schema when given schema is undefined ' +
        'and shouldUpdateSchemaFunction is true',
    () => {
        const graphqlServer = new GraphQLServer({
            logger: NoOpTestLogger,
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
        logger: NoOpTestLogger,
        metricsClient: new SimpleMetricsClient(),
        parseFunction: parse,
        rootValue: userSchemaResolvers,
        schema: userSchema,
        validateFunction: validate,
    })
    expect(graphqlServer.schemaValidationErrors.length).toBe(0)

    const result = await graphqlServer.handleRequest({
        query: usersQuery,
    })
    expect(result.executionResult.data?.users).toEqual([userOne, userTwo])
    expect(result.statusCode).toBe(200)
    expect(result.requestInformation?.query).toBe(usersQuery)
})

test('Should receive correct error message if response contains a GraphQLError', async () => {
    const logger = new JsonTestLogger()
    const graphqlServer = new GraphQLServer({
        executionResultErrorMessage: 'Error:',
        logger: logger,
        metricsClient: new SimpleMetricsClient(),
        rootValue: userSchemaResolvers,
        schema: userSchema,
        validationErrorMessage: 'ValidationError:',
    })
    await graphqlServer.handleRequest({
        query: returnErrorQuery,
    })
    expect(logger.logEntries.at(1)?.message).toBe(
        'Error: Something went wrong!',
    )
})

test('Should receive correct error message if request validation fails', async () => {
    const logger = new JsonTestLogger()
    const response = new StandaloneGraphQLServerResponse()
    const graphqlServer = new GraphQLServer({
        executionResultErrorMessage: 'Error:',
        logger: logger,
        metricsClient: new SimpleMetricsClient(),
        rootValue: userSchemaResolvers,
        schema: userSchema,
        validationErrorMessage: 'ValidationError:',
    })
    await graphqlServer.handleRequest(
        {
            query: 'query users{ users { unknownField } }',
        },
        response,
    )
    expect(response.statusCode).toBe(200)
    expect(logger.logEntries.at(1)?.message).toBe(
        'ValidationError: Cannot query field "unknownField" on type "User".',
    )
})

test('Should use SimpleMetricsClient as fallback if cpuUsage is not available', async () => {
    const savedProcess = process

    // eslint-disable-next-line no-global-assign
    process = {} as NodeJS.Process
    // Necessary for Jest to measure/evaluate test performance
    process.hrtime = savedProcess.hrtime

    const graphqlServer = new GraphQLServer({
        logger: NoOpTestLogger,
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
            logger: NoOpTestLogger,
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
            logger: NoOpTestLogger,
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

test('Should adjust execution result with data from mutation context info', async () => {
    const logger = new JsonTestLogger(true)
    const graphqlServer = new GraphQLServer({
        adjustGraphQLExecutionResult: (
            parameters: StandaloneResponseParameters,
        ): GraphQLExecutionResult => {
            const result = parameters.executionResult
            const contextRecord = parameters.context as Record<string, unknown>
            if (result && contextRecord.jwt) {
                result.customHeaders = { 'x-jwt': String(contextRecord.jwt) }
            }
            return (
                result ?? {
                    executionResult: {
                        errors: [new GraphQLError('No result', {})],
                    },
                }
            )
        },

        collectErrorMetricsFunction: defaultCollectErrorMetrics,
        contextFunction: (): Record<string, unknown> => ({
            authHeader: '123456789',
        }),
        extractInformationFromRequest: extractInformationFromRequest,
        logger: logger,
        metricsClient: new SimpleMetricsClient(),
        parseFunction: parse,
        rootValue: userSchemaResolvers,
        schema: userSchema,
        validateFunction: validate,
    })
    const result = await graphqlServer.handleRequest({
        query: loginMutation,
    })
    expect(result.executionResult.data?.login).toEqual({ jwt: 'jwt-123456789' })
    expect(result.customHeaders).toEqual({ 'x-jwt': 'jwt-123456789' })
    expect(result.statusCode).toBe(200)
    expect(result.requestInformation?.query).toBe(loginMutation)
    expect(logger.logEntries.at(-1)?.query).toBe(loginMutation)
})

test('Should correctly handle requests when returnNotAcceptableForUnsupportedResponseFormat is true', async () => {
    const testLogger = new JsonTestLogger(false)
    const response = new StandaloneGraphQLServerResponse()
    const graphqlServer = new GraphQLServer({
        logger: testLogger,
        returnNotAcceptableForUnsupportedResponseFormat: true,
        rootValue: userSchemaResolvers,
        schema: userSchema,
    })

    // Case: Missing Accept header
    await graphqlServer.handleRequest(requestForQuery(usersQuery), response)
    let responseAsObject = response.getLastResponseAsObject()
    let expectedPartInErrorMessage =
        'Request has unsupported response format in Accept header: undefined'
    expect(response.statusCode).toBe(406)
    expect(response.headers.get('accept')).toBe(
        'application/graphql-response+json, application/json',
    )
    expect(responseAsObject.errors[0].message).toContain(
        expectedPartInErrorMessage,
    )
    let logEntry = testLogger.logEntries.at(1)
    expect(logEntry?.message).toContain(expectedPartInErrorMessage)
    expect(logEntry?.level).toBe('ERROR')
    expect(logEntry?.errorName).toBe('NOT_ACCEPTABLE_ERROR')

    // Case: Existing Accept header
    await graphqlServer.handleRequest(
        requestForQuery(usersQuery, {
            accept: 'application/graphql-response+json, application/json;q=0.9',
            'content-type': 'application/json',
        }),
        response,
    )
    responseAsObject = response.getLastResponseAsObject()
    expect(response.statusCode).toBe(200)
    expect(response.headers.get('content-type')).toBe(
        'application/graphql-response+json; charset=utf-8',
    )
    expect(responseAsObject.data?.users).toEqual([userOne, userTwo])

    // Case: SyntaxError
    await graphqlServer.handleRequest(
        {
            body: '{"query":"unknown"}',
            headers: {
                accept: 'application/graphql-response+json, application/json;q=0.9',
                'content-type': 'application/json',
            },
            method: 'POST',
        },
        response,
    )
    responseAsObject = response.getLastResponseAsObject()
    expect(response.statusCode).toBe(400)
    expect(response.headers.get('content-type')).toBe(
        'application/graphql-response+json; charset=utf-8',
    )
    expect(responseAsObject.errors.at(0).message).toEqual(
        'Syntax Error: Unexpected Name "unknown".',
    )

    // Case: ValidationError
    await graphqlServer.handleRequest(
        requestForQuery('query users{ users { unknownField } }', {
            accept: 'application/graphql-response+json, application/json;q=0.9',
            'content-type': 'application/json',
        }),
        response,
    )
    responseAsObject = response.getLastResponseAsObject()
    expect(response.statusCode).toBe(400)
    expect(response.headers.get('content-type')).toBe(
        'application/graphql-response+json; charset=utf-8',
    )
    expect(responseAsObject.errors.at(0).message).toEqual(
        'Cannot query field "unknownField" on type "User".',
    )
})

function expectRootQueryNotDefined(graphqlServer: GraphQLServer): void {
    const schemaValidationErrors = graphqlServer.getSchemaValidationErrors()
    expect(schemaValidationErrors?.length).toBe(1)
    expect(schemaValidationErrors?.[0].message).toBe(
        'Query root type must be provided.',
    )
}
