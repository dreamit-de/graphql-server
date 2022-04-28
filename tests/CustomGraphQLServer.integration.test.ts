/* eslint-disable @typescript-eslint/naming-convention */
import express, {Express} from 'express'
import {Server} from 'node:http'
import {
    GraphQLServer,
    GraphQLServerOptions,
    GraphQLServerRequest,
    GraphQLServerResponse
} from '../src/'
import {
    usersQuery,
    userSchema,
    userSchemaResolvers,
} from './ExampleSchemas'
import {
    ExecutionResult,
} from 'graphql'
import {
    fetchResponse,
    GRAPHQL_SERVER_PORT,
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    LOGGER
} from './TestHelpers'

let customGraphQLServer: GraphQLServer
let graphQLServer: Server

beforeAll(async() => {
    graphQLServer = setupGraphQLServer().listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)
})

afterAll(async() => {
    await graphQLServer.close()
})

test('Should return value from context instead of user data ', async() => {
    customGraphQLServer.setOptions({
        schema: userSchema,
        rootValue: userSchemaResolvers,
        logger: LOGGER,
        debug: true,
        reassignAggregateError: false,
        contextFunction: () => {
            return {
                'customText': 'customResponse'
            }
        }
    })
    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject).toStrictEqual('customResponse')
    expect(responseObject.extensions).toBe(undefined)

    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

class CustomGraphQLServer extends GraphQLServer {
    constructor(options: GraphQLServerOptions) {
        super(options)
    }

    sendResponse(response: GraphQLServerResponse,
        executionResult: ExecutionResult,
        statusCode: number,
        customHeaders: Record<string, string>,
        request: GraphQLServerRequest,
        context: unknown): void {

        response.statusCode = statusCode
        response.setHeader('Content-Type', 'application/json; charset=utf-8')

        if (context) {
            const contextRecord = context as Record<string, unknown>
            response.end(Buffer.from(JSON.stringify(contextRecord.customText), 'utf8'))
        }
    }

}

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new CustomGraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })
    return graphQLServerExpress
}
