// Removes validation recommendations matching the defined recommendation text
import {GraphQLError} from 'graphql'

export const recommendationText = 'Did you mean'

export function removeValidationRecommendationsFromErrors(
    validationErrors: ReadonlyArray<GraphQLError>
)
: ReadonlyArray<GraphQLError> {
    for (const validationError of validationErrors) {
        if (validationError.message.includes(recommendationText)) {
            validationError.message = validationError.message.slice(0,
                Math.max(0, validationError.message.indexOf(recommendationText)))
        }
    }
    return validationErrors
}
