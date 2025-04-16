import { StandardSchemaV1 } from '@dreamit/graphql-server-base'

/**
 * Gets the schema validation errors by validating input against given schema. (adapted from http://standardschema.dev)
 * @param {T extends StandardSchemaV1} schema - The schema to validate against.
 * @param {StandardSchemaV1.InferInput<T>} input - The input to validate.
 * @returns {Promise<StandardSchemaV1.InferOutput<T>>} The validated output.
 */
export function getResponseSchemaValidationErrors<T extends StandardSchemaV1>(
    schema: T,
    input: StandardSchemaV1.InferInput<T>,
): readonly StandardSchemaV1.Issue[] | undefined {
    let result = schema['~standard'].validate(input)
    if (result instanceof Promise) {
        throw new TypeError('Validation function must be synchronous')
    } else {
        return result.issues
    }
}
