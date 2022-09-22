/* eslint-disable @typescript-eslint/naming-convention */
import bodyParser from 'body-parser'
import express, {Express} from 'express'
import {Server} from 'node:http'
import {
    DefaultResponseHandler,
    GraphQLServer,
    JsonLogger,
    ResponseParameters,
    TextLogger
} from '../../src'
import {
    usersQuery,
    userSchema,
    userSchemaResolvers,
    returnErrorQuery,
} from '../ExampleSchemas'
import {
    fetchResponse,
    GRAPHQL_SERVER_PORT,
    INITIAL_GRAPHQL_SERVER_OPTIONS,
} from '../TestHelpers'
import {Buffer} from 'node:buffer'

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
        logger: new JsonLogger('test-logger', 'customGraphQLServer'),
        responseHandler: new CustomResponseHandler(),
        reassignAggregateError: false,
        contextFunction: () => {
            return {
                'customText': 'customResponse',
                'serviceName': 'myRemoteService'
            }
        }
    })
    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject).toStrictEqual('customResponse')
    expect(responseObject.extensions).toBeUndefined()

    customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
})

test('Should return error if context serviceName is different as graphql server serviceName',
    async() => {
        customGraphQLServer.setOptions({
            schema: userSchema,
            rootValue: userSchemaResolvers,
            logger: new TextLogger('test-logger', 'customGraphQLServer', true),
            reassignAggregateError: false,
            contextFunction: () => {
                return {
                    'serviceName': 'myTestServiceAlternative'
                }
            }
        })
        const response = await fetchResponse(`{"query":"${returnErrorQuery}"}`)
        const responseObject = await response.json()
        expect(responseObject.errors[0].message).toBe('Something went wrong!')
        expect(responseObject.extensions).toBeUndefined()

        customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
    })

class CustomResponseHandler extends DefaultResponseHandler {

    sendResponse(responseParameters: ResponseParameters): void {
        const {
            context,
            executionResult,
            response,
            statusCode,
        }
            = responseParameters
        if (statusCode) {
            response.statusCode = statusCode
        }
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        const contextRecord = context as Record<string, unknown>
        if (contextRecord && contextRecord.customText) {
            response.end(Buffer.from(JSON.stringify(contextRecord.customText), 'utf8'))
        } else {
            response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
        }
    }
}

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
    graphQLServerExpress.use(bodyParser.json())
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })
    return graphQLServerExpress
}
