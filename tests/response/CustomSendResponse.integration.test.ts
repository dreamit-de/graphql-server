/* eslint-disable @typescript-eslint/naming-convention */

import {
    GRAPHQL_SERVER_PORT,
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    NoStacktraceTextLogger,
    fetchResponse,
} from '../TestHelpers'
import {
    GraphQLServer,
    JsonLogger,
} from '~/src'
import express, {Express} from 'express'
import {
    returnErrorQuery,
    userSchema,
    userSchemaResolvers,
    usersQuery,
} from '../ExampleSchemas'


import {Buffer} from 'node:buffer'
import { ResponseParameters } from '@dreamit/graphql-server-base'
import {Server} from 'node:http'
import bodyParser from 'body-parser'

let customGraphQLServer: GraphQLServer
let graphQLServer: Server

beforeAll(() => {
    graphQLServer = setupGraphQLServer().listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)
})

afterAll(() => {
    graphQLServer.close()
})

test('Should return value from context instead of user data ', async() => {
    customGraphQLServer.setOptions({
        contextFunction: () => {
            return {
                'customText': 'customResponse',
                'serviceName': 'myRemoteService'
            }
        },
        logger: new JsonLogger('test-logger', 'customGraphQLServer'),
        reassignAggregateError: false,
        rootValue: userSchemaResolvers,
        schema: userSchema,
        sendResponse: customSendResponse
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
            contextFunction: ({serverOptions}) => {
                if (serverOptions.logger) {
                    serverOptions.logger.info('Calling requestResponseContextFunction in test')
                }
                return {
                    'serviceName': 'myTestServiceAlternative'
                }
            },
            logger: new NoStacktraceTextLogger('test-logger', 'customGraphQLServer', true),
            reassignAggregateError: false,
            rootValue: userSchemaResolvers,
            schema: userSchema
        })
        const response = await fetchResponse(`{"query":"${returnErrorQuery}"}`)
        const responseObject = await response.json()
        expect(responseObject.errors[0].message).toBe('Something went wrong!')
        expect(responseObject.extensions).toBeUndefined()

        customGraphQLServer.setOptions(INITIAL_GRAPHQL_SERVER_OPTIONS)
    })

function customSendResponse(responseParameters: ResponseParameters): void {
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


function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
    graphQLServerExpress.use(bodyParser.json())
    graphQLServerExpress.all('/graphql', (request, response) => {
        return customGraphQLServer.handleRequest(request, response)
    })
    return graphQLServerExpress
}
