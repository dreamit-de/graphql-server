import {buildSchema,
    GraphQLSchema} from 'graphql';
import {GraphQLRequestInfo} from '../src/server/GraphQLServer';

//Contains example schemas that can be used across tests

export const initialSchemaWithOnlyDescription = new GraphQLSchema({description:'initial'})

export const userRequest: GraphQLRequestInfo = {
    query: `query user {
    user {
        userId
        userName
    }`,
    operationName: 'user',
    variables: {userId: '1'}
}

export const userRequestWithoutOperationName: GraphQLRequestInfo = {
    query: userRequest.query,
    variables: userRequest.variables
}

export const userRequestWithoutVariables: GraphQLRequestInfo = {
    query: userRequest.query,
    operationName: userRequest.operationName
}


export const userSchema = buildSchema(`
  schema {
    query: Query
  }
  
  type Query {
    users: [User]
    user(id: String!): User
  }
  
  type User {
    userId: String
    userName: String
  }
`)
