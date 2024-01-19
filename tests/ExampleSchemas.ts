import { GraphQLError, GraphQLSchema, buildSchema } from 'graphql'
import { AggregateError } from '~/src'
import { GraphQLRequestInfo } from '@dreamit/graphql-server-base'

// Contains example schemas and data that can be used across tests

interface User {
    userId: string
    userName: string
}

interface LogoutResult {
    result: string
}

export const initialSchemaWithOnlyDescription = new GraphQLSchema({
    description: 'initial',
})

export const userOne: User = { userId: '1', userName: 'UserOne' }
export const userTwo: User = { userId: '2', userName: 'UserTwo' }

export const userQuery =
    'query user($id201: String!){ user(id: $id201) { userId userName } }'
export const userVariables = '{"id201":"1"}'
export const usersQuery = 'query users{ users { userId userName } }'
export const usersQueryWithUnknownField =
    'query users{ users { userId userName hobby } }'
export const returnErrorQuery = 'query returnError{ returnError { userId } }'
const loginMutation =
    'mutation login{ login(userName:"magic_man", password:"123456") { jwt } }'
export const logoutMutation = 'mutation logout{ logout { result } }'
export const introspectionQuery =
    'query introspection{ __schema { queryType { name } } }'

export const usersRequest: GraphQLRequestInfo = {
    operationName: 'users',
    query: usersQuery,
}

export const loginRequest: GraphQLRequestInfo = {
    operationName: 'login',
    query: loginMutation,
}
export const usersRequestWithoutOperationName: GraphQLRequestInfo = {
    query: usersRequest.query,
}
export const usersRequestWithoutVariables: GraphQLRequestInfo = {
    operationName: usersRequest.operationName,
    query: usersRequest.query,
}

export const userSchema = buildSchema(`
  schema {
    query: Query
    mutation: Mutation
  }
  
  type Query {
    returnError: User 
    users: [User]
    user(id: String!): User
  }
  
  type Mutation {
    login(userName: String, password: String): LoginData
    logout: LogoutResult
  }
  
  type User {
    userId: String
    userName: String
  }
  
  type LoginData {
    jwt: String
  }
  
  type LogoutResult {
    result: String
  }
`)

export const userSchemaResolvers = {
    logout(): LogoutResult {
        return { result: 'Goodbye!' }
    },
    returnError(): User {
        throw new GraphQLError('Something went wrong!', {})
    },
    user(input: { id: string }): User {
        switch (input.id) {
            case '1': {
                return userOne
            }
            case '2': {
                return userTwo
            }
            default: {
                throw new GraphQLError(
                    `User for userid=${input.id} was not found`,
                    {},
                )
            }
        }
    },
    users(): User[] {
        return [userOne, userTwo]
    },
}

export const multipleErrorResponse = {
    errors: [
        new GraphQLError('The first error!, The second error!', {
            originalError: {
                errors: [
                    new GraphQLError('The first error!', {}),
                    new GraphQLError('The second error!', {}),
                ],
                message: 'The first error!, The second error!',
                name: 'AggregateError',
            } as AggregateError,
        }),
    ],
}
