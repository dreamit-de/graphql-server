/* eslint-disable @typescript-eslint/naming-convention */
import { ExecutionResult } from 'graphql'
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue'
import { expect, test } from 'vitest'
import { GraphQLServer } from '~/src'
import {
    multipleErrorResponse,
    userQuery,
    userSchema,
    userSchemaResolvers,
} from './ExampleSchemas'
import {
    NO_LOGGER,
    StandaloneGraphQLServerResponse,
    sendRequest,
} from './TestHelpers'

const standaloneGraphQLServerResponse = new StandaloneGraphQLServerResponse()

/*
 * Reassign test is located in this separate test as it seems to get in conflict with the
 * matching "reassignAggregateError disabled" test depending on the execution order and speed.
 */
test(
    'Should reassign AggregateError to original errors field' +
        ' when reassignAggregateError is enabled',
    async () => {
        const customGraphQLServer = new GraphQLServer({
            executeFunction: (): PromiseOrValue<ExecutionResult> =>
                multipleErrorResponse,
            logger: NO_LOGGER,
            reassignAggregateError: true,
            rootValue: userSchemaResolvers,
            schema: userSchema,
        })

        await sendRequest(
            customGraphQLServer,
            standaloneGraphQLServerResponse,
            `{"query":"${userQuery}"}`,
        )
        const responseBody =
            standaloneGraphQLServerResponse.getLastResponseAsObject()
        expect(responseBody.errors[0].message).toBe('The first error!')
        expect(responseBody.errors[1].message).toBe('The second error!')
    },
)
