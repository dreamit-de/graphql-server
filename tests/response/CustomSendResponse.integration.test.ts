/* eslint-disable @typescript-eslint/naming-convention */
import { ResponseParameters } from '@dreamit/graphql-server-base'
import { Buffer } from 'node:buffer'
import { expect, test } from 'vitest'
import { GraphQLServer } from '~/src'
import {
    returnErrorQuery,
    userSchema,
    userSchemaResolvers,
    usersQuery,
} from '../ExampleSchemas'
import {
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    NO_LOGGER,
    StandaloneGraphQLServerResponse,
    sendRequest,
} from '../TestHelpers'

const customGraphQLServer = new GraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
const standaloneGraphQLServerResponse = new StandaloneGraphQLServerResponse()

test('Should return value from context instead of user data ', async () => {
    customGraphQLServer.setOptions({
        contextFunction: () => {
            return {
                customText: 'customResponse',
                serviceName: 'myRemoteService',
            }
        },
        logger: NO_LOGGER,
        reassignAggregateError: false,
        rootValue: userSchemaResolvers,
        schema: userSchema,
        sendResponse: customSendResponse,
    })

    await sendRequest(
        customGraphQLServer,
        standaloneGraphQLServerResponse,
        `{"query":"${usersQuery}"}`,
    )
    const responseObject = standaloneGraphQLServerResponse.getLastResponse()
    expect(responseObject).toStrictEqual('"customResponse"')
})

test(
    'Should return error if context serviceName' +
        ' is different as graphql server serviceName',
    async () => {
        customGraphQLServer.setOptions({
            contextFunction: ({ serverOptions }) => {
                if (serverOptions.logger) {
                    serverOptions.logger.info(
                        'Calling requestResponseContextFunction in test',
                    )
                }
                return {
                    serviceName: 'myTestServiceAlternative',
                }
            },
            logger: NO_LOGGER,
            reassignAggregateError: false,
            rootValue: userSchemaResolvers,
            schema: userSchema,
        })

        await sendRequest(
            customGraphQLServer,
            standaloneGraphQLServerResponse,
            `{"query":"${returnErrorQuery}"}`,
        )
        const responseBody =
            standaloneGraphQLServerResponse.getLastResponseAsObject()
        expect(responseBody.extensions).toBeUndefined()
        expect(responseBody.errors[0].message).toBe('Something went wrong!')
    },
)

function customSendResponse(responseParameters: ResponseParameters): void {
    const { context, executionResult, response, statusCode } =
        responseParameters
    if (statusCode) {
        response.statusCode = statusCode
    }
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    const contextRecord = context as Record<string, unknown>
    if (contextRecord && contextRecord.customText) {
        response.end(
            Buffer.from(JSON.stringify(contextRecord.customText), 'utf8'),
        )
    } else {
        response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
    }
}
