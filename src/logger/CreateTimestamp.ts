export function createTimestamp(date = new Date()): string {
    return date.toISOString()
}
