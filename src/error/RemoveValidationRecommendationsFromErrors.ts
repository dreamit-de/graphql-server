// Removes validation recommendations matching the defined recommendation text
import type { GraphQLError } from 'graphql'

const recommendationText = 'Did you mean'

function removeValidationRecommendationsFromErrors(
    validationErrors: readonly GraphQLError[],
): readonly GraphQLError[] {
    for (const validationError of validationErrors) {
        if (validationError.message.includes(recommendationText)) {
            validationError.message = validationError.message.slice(
                0,
                Math.max(
                    0,
                    validationError.message.indexOf(recommendationText),
                ),
            )
        }
    }
    return validationErrors
}

export { recommendationText, removeValidationRecommendationsFromErrors }
