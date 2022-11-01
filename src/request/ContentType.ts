export enum ContentType {
    graphql = 'application/graphql',
    json = 'application/json',
    unknown = '',
    urlencoded = 'application/x-www-form-urlencoded'
}

export function getContentType(contentType?: string): ContentType {
    if (contentType) {
        if (contentType.includes(ContentType.graphql)) {
            return ContentType.graphql
        }  else if (contentType.includes(ContentType.json)) {
            return ContentType.json
        } else if (contentType.includes(ContentType.urlencoded)) {
            return ContentType.urlencoded
        }
    }
    return ContentType.unknown
}
