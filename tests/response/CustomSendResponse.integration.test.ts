import { ResponseParameters } from '@dreamit/graphql-server-base'
import {
    NoOpTestLogger,
    returnErrorQuery,
    StandaloneGraphQLServerResponse,
    userSchema,
    userSchemaResolvers,
    usersQuery,
} from '@dreamit/graphql-testing'
import { GraphQLServer } from 'src'
import { expect, test } from 'vitest'
import { INITIAL_GRAPHQL_SERVER_OPTIONS, sendRequest } from '../TestHelpers'

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
        logger: NoOpTestLogger,
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
            logger: NoOpTestLogger,
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
        response.end(JSON.stringify(contextRecord.customText))
    } else {
        response.end(JSON.stringify(executionResult))
    }
}
