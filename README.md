# graphql-server

A GraphQL server implementation written in NodeJS/Typescript. It uses the standard graphql library to receive 
GraphQL requests and send back appropriate responses.

## Installation

```sh
npm install --save @dreamit/graphql-server
```

TypeScript declarations are provided within the project.

## Usage

You can create a new instance of `GraphQLServer` with the options necessary for your tasks. The `handleRequest` function of 
the `GraphQLServer` can be integrated with many fitting webservers that provide a matching `Request` and `Response` object
(e.g. ExpressJS).

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema})
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

`GraphQLServer` provides default values and behaviour out of the box. It is recommended to at least provide a `schema` 
so the request won't be rejected because of a missing/invalid schema. When using it with a local schema it is 
recommended to provide a `rootValue` to return a fitting value. Examples for these requests can be found in the 
integration test in the `GraphQLServer.integration.test.ts` class in the `tests` folder. 

## Options

The `GraphQLServer` accepts the following options. Note that all options are optional and can be overwritten by 
calling the `setOptions` function of the `GraphQLServer` instance.

### Application behaviour

- **`debug`**: If `true` additional log output will be created.

### GraphQL related options

- **`schema`**: The schema that is used to handle the request and send a response. If undefined the `GraphQLServer` will
reject responses with a GraphQL error response with status code 500.
- **`formatErrorFunction`**: Function that can be used to format occurring GraphQL errors. Given a `GraphQLError` it
should return a `GraphQLFormattedError`. By default `formatError` from `graphql` core library is called.
- **`schemaValidationFunction`**: Function that is called when a schema is set or updated. Given a `GraphQLSchema` it
  can return a `ReadonlyArray<GraphQLError>` or an empty array if no errors occurred/should be returned. 
By default `validateSchema` from `graphql` core library is called.
- **`parseFunction`**: Function that is called to create a `DocumentNode` with the extracted query in the 
request information. Given a `source` and `ParseOptions` it should return a `DocumentNode`.
    By default `parse` from `graphql` core library is called.
- **`validationRules`**: Validation rules that are used when `validateSchemaFunction` is called. Can be used e.g. to 
check whether the request contains an introspection query that should be rejected.
- **`validationTypeInfo`**: Validation type info that is used when `validateSchemaFunction` is called.
- **`validationOptions`**: Validation options containing `{ maxErrors?: number }` that is used 
when `validateSchemaFunction` is called.
- **`removeValidationRecommendations`**: If `true` removes validation recommendations like "users not found. 
Did you mean user?". For non-production environments it is usually safe to allow recommendations. 
For production environments when not providing access to third-party users it is considered good practice to remove 
these recommendations so users can not circumvent disabled introspection request by using recommendations to explore 
the schema.
- **`validateFunction`**: Validation function that validates the extracted request against the available schema. 
By default `validate` from `graphql` core library is called. 


### Technical components
- **`logger`**: Logger to be used in the GraphQL server. `TextLogger` and `JsonLogger` are available in the module.
  Own Logger can be used by implementing `Logger` interface.
- **`requestInformationExtractor`**: The `RequestInformationExtractor` used to extract information from the `Request`
  and return a `Promise<GraphQLRequestInfo>`. By default, the `DefaultRequestInformationExtractor` is used that tries to
  extract the information from the body and URL params of the request. Own Extractor can be used by
  implementing `RequestInformationExtractor` interface.


## To be added to options descriptions

readonly rootValue?: unknown | undefined
readonly contextValue?: unknown
readonly fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
readonly typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
readonly executeFunction?: (schema: GraphQLSchema,
document: DocumentNode,
rootValue?: unknown,
contextValue?: unknown,
variableValues?: Maybe<{ [key: string]: unknown }>,
operationName?: Maybe<string>,
fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>,
typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>) => PromiseOrValue<ExecutionResult>
readonly extensionFunction?: (request: Request, requestInformation: GraphQLRequestInfo, executionResult: ExecutionResult) => MaybePromise<undefined | { [key: string]: unknown }>
