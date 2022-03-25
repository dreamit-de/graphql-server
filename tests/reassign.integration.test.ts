/* eslint-disable @typescript-eslint/naming-convention */
import express from 'express'
import {
    GraphQLServer
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
    LOGGER
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
        logger: LOGGER,
        debug: true,
        reassignAggregateError: true,
        executeFunction: ():PromiseOrValue<ExecutionResult> => (multipleErrorResponse)
    })
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })

    const graphQLServer = graphQLServerExpress.listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)

    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('The first error!')
    expect(responseObject.errors[1].message).toBe('The second error!')

    await graphQLServer.close()
})
