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
    expect(responseObject.data.users).toStrictEqual([userOne, userTwo])
    expect(responseObject.extensions).toBeUndefined()
})

test('Should get data response when using a mutation', async() => {
    const response = await fetchResponse(`{"query":"${logoutMutation}"}`)
    const responseObject = await response.json()
    expect(responseObject.data.logout.result).toBe('Goodbye!')
})

test('Should get error response if query does not match expected query format', async() => {
    const response = await fetchResponse('{"query":"unknown"}')
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe(
        'Syntax Error: Unexpected Name "unknown".'
    )
})

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer(INITIAL_GRAPHQL_SERVER_OPTIONS)
    graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
    graphQLServerExpress.all('/graphql', async(request, response) => {
        let query
        try {
            const bodyAsJson = JSON.parse(request.body)
            query = bodyAsJson.query
        } catch {
            query = ''
        }
        return await customGraphQLServer.handleRequest({
            query: query
        }, response)
    })
    return graphQLServerExpress
}
