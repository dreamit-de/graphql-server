import { ResponseParameters } from '@dreamit/graphql-server-base'
import { GraphQLError } from 'graphql'
import { getResponseSchemaValidationErrors } from '../validation/GetResponseSchemaValidationErrors'

/**
 * Default implementation of sendResponse function
 */
export function sendResponse(responseParameters: ResponseParameters): void {
    const {
        customHeaders,
        context,
        logger,
        response,
        statusCode,
        formatErrorFunction,
        responseEndChunkFunction,
        responseStandardSchema,
    } = responseParameters
    let executionResult = responseParameters.executionResult
    logger.debug(
        `Preparing response with executionResult ${JSON.stringify(executionResult)}` +
            `, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}` +
            `, and context ${context}`,
        context,
    )

    try {
        const validationErrors = getResponseSchemaValidationErrors(
            responseStandardSchema,
            executionResult,
        )
        if (validationErrors) {
            executionResult = {
                errors: validationErrors.map(
                    (error) => new GraphQLError(error.message, {}),
                ),
            }
        }
    } catch (error: unknown) {
        logger.error(
            `An error occurred while validating the response: ${error}`,
            error as TypeError,
            'ResponseValidationError',
            context,
        )
    }

    if (executionResult.errors) {
        executionResult.errors.map((element) => formatErrorFunction(element))
    }
    if (statusCode) {
        response.statusCode = statusCode
    }
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (customHeaders) {
        for (const [key, value] of Object.entries(customHeaders)) {
            logger.debug(`Set custom header ${key} to ${value}`, context)
            response.setHeader(key, String(value))
        }
    }
    response.end(responseEndChunkFunction(executionResult))
}
