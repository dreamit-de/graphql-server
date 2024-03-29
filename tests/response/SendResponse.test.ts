/* eslint-disable @typescript-eslint/naming-convention */
import { GraphQLError, GraphQLFormattedError } from 'graphql'
import { expect, test } from 'vitest'
import { sendResponse } from '~/src'
import { StandaloneGraphQLServerResponse, TEXT_LOGGER } from '../TestHelpers'

const standaloneGraphQLServerResponse = new StandaloneGraphQLServerResponse()

test('Should use default response.end behavior if no responseEndChunkFunction if defined', () => {
    sendResponse({
        context: undefined,
        executionResult: {
            data: { message: 'Did work!' },
        },
        formatErrorFunction: function (
            error: GraphQLError,
        ): GraphQLFormattedError {
            return error
        },
        logger: TEXT_LOGGER,
        response: standaloneGraphQLServerResponse,
    })
    expect(
        standaloneGraphQLServerResponse.getLastResponseAsObject().data.message,
    ).toStrictEqual('Did work!')
})
