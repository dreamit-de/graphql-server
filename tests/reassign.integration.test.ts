/* eslint-disable @typescript-eslint/naming-convention */
import {
    GraphQLServer, 
    NoStacktraceJsonLogger
} from '~/src'
import { 
    StandaloneGraphQLServerResponse, 
    sendRequest
} from './TestHelpers'
import {
    multipleErrorResponse,
    userQuery,
    userSchema,
    userSchemaResolvers,
} from './ExampleSchemas'
import {ExecutionResult } from 'graphql'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'

const standaloneGraphQLServerResponse = new StandaloneGraphQLServerResponse()

/*
 * Reassign test is located in this separate test as it seems to get in conflict with the
 * matching "reassignAggregateError disabled" test depending on the execution order and speed.
 */
test('Should reassign AggregateError to original errors field' +
    ' when reassignAggregateError is enabled', async() => {
    const customGraphQLServer = new GraphQLServer({
        executeFunction: (): PromiseOrValue<ExecutionResult> => (multipleErrorResponse),
        logger: new NoStacktraceJsonLogger('nostack-logger', 'reassign-service', true),
        reassignAggregateError: true,
        rootValue: userSchemaResolvers,
        schema: userSchema
    })

    await sendRequest(customGraphQLServer, 
        standaloneGraphQLServerResponse,
        `{"query":"${userQuery}"}`)
    const responseBody = standaloneGraphQLServerResponse.getLastResponseAsObject()
    expect(responseBody.errors[0].message).toBe('The first error!')
    expect(responseBody.errors[1].message).toBe('The second error!')
})
