import type { ContentType } from '@dreamit/graphql-server-base'

export function getContentType(contentType?: string): ContentType {
    if (contentType) {
        if (contentType.includes('application/graphql')) {
            return 'application/graphql'
        } else if (contentType.includes('application/json')) {
            return 'application/json'
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            return 'application/x-www-form-urlencoded'
        }
    }
    return ''
}
