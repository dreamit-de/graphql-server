import { ContentType } from '@dreamit/graphql-server-base'

export function getContentType(contentType?: string): ContentType {
    if (
        contentType &&
        (contentType.includes('application/graphql') ||
            contentType.includes('application/json') ||
            contentType.includes('application/x-www-form-urlencoded'))
    ) {
        return contentType as ContentType
    }
    return ''
}
