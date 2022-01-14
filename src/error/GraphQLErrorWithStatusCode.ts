import {GraphQLError} from 'graphql'

export interface GraphQLErrorWithStatusCode {
    graphQLError: GraphQLError
    statusCode: number
}
