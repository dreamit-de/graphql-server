/* eslint-disable @typescript-eslint/naming-convention */
import bodyParser from 'body-parser'
import express from 'express'
import {
    GraphQLServer,
    JsonLogger
} from '../src/'

import {
    usersQuery,
    userSchema,
    userSchemaResolvers,
    multipleErrorResponse
} from './ExampleSchemas'
import {
    fetchResponse,
    GRAPHQL_SERVER_PORT,
} from './TestHelpers'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'
import {ExecutionResult} from 'graphql'

/*
 * Reassign test is located in this separate test as it seems to get in conflict with the
 * matching "reassignAggregateError disabled" test depending on the execution order and speed.
 */
test('Should reassign AggregateError to original errors field' +
    ' when reassignAggregateError is enabled', async() => {
    const graphQLServerExpress = express()
    const customGraphQLServer = new GraphQLServer({
        schema: userSchema,
        rootValue: userSchemaResolvers,
        logger: new JsonLogger('test-logger', 'reassign-service', true),
        reassignAggregateError: true,
        executeFunction: ():PromiseOrValue<ExecutionResult> => (multipleErrorResponse)
    })
    graphQLServerExpress.use(bodyParser.json())
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequestAndSendResponse(request, response)
    })

    const graphQLServer = graphQLServerExpress.listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)

    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('The first error!')
    expect(responseObject.errors[1].message).toBe('The second error!')

    graphQLServer.close()
})
