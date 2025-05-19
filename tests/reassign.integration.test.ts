import {
    aggregateErrorResponse,
    NoOpTestLogger,
    StandaloneGraphQLServerResponse,
    userQuery,
    userSchema,
    userSchemaResolvers,
} from '@dreamit/graphql-testing'
import type { ExecutionResult } from 'graphql'
import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue'
import { GraphQLServer } from 'src'
import { expect, test } from 'vitest'
import { sendRequest } from './TestHelpers'

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
                aggregateErrorResponse,
            logger: NoOpTestLogger,
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
