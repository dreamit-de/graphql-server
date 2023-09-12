/* eslint-disable @typescript-eslint/naming-convention */
import {
    GRAPHQL_SERVER_PORT,
    INITIAL_GRAPHQL_SERVER_OPTIONS,
    fetchResponse,
} from '../TestHelpers'
import express, {Express} from 'express'
import {
    logoutMutation,
    userOne,
    userTwo,
    usersQuery,
} from '../ExampleSchemas'

import {GraphQLServer} from '~/src'
import {Server} from 'node:http'
import bodyParser from 'body-parser'
import fetch from 'cross-fetch'

let customGraphQLServer: GraphQLServer
let graphQLServer: Server

beforeAll(() => {
    graphQLServer = setupGraphQLServer().listen({port: GRAPHQL_SERVER_PORT})
    console.info(`Starting GraphQL server on port ${GRAPHQL_SERVER_PORT}`)
})

afterAll(() => {
    graphQLServer.close()
})

test('Should get data response', async() => {
    const response = await fetchResponse(`{"query":"${usersQuery}"}`)
    const responseObject = await response.json()
    expect(responseObject.result.executionResult.data.users).toStrictEqual([userOne, userTwo])
    expect(responseObject.result.executionResult.extensions).toBeUndefined()
    expect(responseObject.result.statusCode).toBe(200)
    expect(responseObject.result.requestInformation.query).toBe(usersQuery)
})

test('Should get data response when using a mutation', async() => {
    const response = await fetchResponse(`{"query":"${logoutMutation}"}`)
    const responseObject = await response.json()
    expect(responseObject.result.executionResult.data.logout.result).toBe('Goodbye!')
    expect(responseObject.result.requestInformation.query).toBe(logoutMutation)
})

test('Should get error response if query does not match expected query format', async() => {
    const response = await fetchResponse('{"query":"unknown"}')
    const responseObject = await response.json()
    expect(responseObject.result.executionResult.errors[0].message).toBe(
        'Syntax Error: Unexpected Name "unknown".'
    )
    expect(responseObject.result.requestInformation.query).toBe('unknown')
})

test('Should get error response if invalid method is used', async() => {
    const response = await fetchResponse('doesnotmatter', 'PUT')
    const responseObject = await response.json()
    expect(responseObject.result.executionResult.errors[0].message).toBe(
        'GraphQL server only supports GET and POST requests. Got PUT'
    )
    const allowResponseHeader = responseObject.result.customHeaders.allow
    expect(allowResponseHeader).toBe('GET, POST')
})

test(
    'Should get correct error response if GET method is used and no query is provided', async() => {
        const response = await fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/graphql`)
        const responseObject = await response.json()
        expect(responseObject.result.executionResult.errors[0].message).toBe(
            'Request cannot be processed. No query was found in parameters or body. ' + 
            'Used method is GET'
        )
    }
)

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
    graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
    graphQLServerExpress.all('/graphql', async(request, response) => {
        const executionResult = await customGraphQLServer.handleRequest(request)
        return response.send({result: executionResult})
    })
    return graphQLServerExpress
}
