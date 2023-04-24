/* eslint-disable @typescript-eslint/naming-convention */
import {
    GRAPHQL_SERVER_PORT,
    NoStacktraceJsonLogger,
    fetchResponse,
} from './TestHelpers'
import {
    multipleErrorResponse,
    userSchema,
    userSchemaResolvers,
    usersQuery
} from './ExampleSchemas'
import {ExecutionResult} from 'graphql'
import {GraphQLServer} from '~/src'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'
import bodyParser from 'body-parser'
import express from 'express'

/*
 * Reassign test is located in this separate test as it seems to get in conflict with the
 * matching "reassignAggregateError disabled" test depending on the execution order and speed.
 */
test('Should reassign AggregateError to original errors field' +
    ' when reassignAggregateError is enabled', async() => {
    const graphQLServerExpress = express()
    const customGraphQLServer = new GraphQLServer({
        executeFunction: (): PromiseOrValue<ExecutionResult> => (multipleErrorResponse),
        logger: new NoStacktraceJsonLogger('nostack-logger', 'reassign-service', true),
        reassignAggregateError: true,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })
    graphQLServerExpress.use(bodyParser.json())
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })

    const graphQLServer = graphQLServerExpress.listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)

    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('The first error!')
    expect(responseObject.errors[1].message).toBe('The second error!')

    graphQLServer.close()
})
