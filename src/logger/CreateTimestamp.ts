import { DateFunction, nowDateFunction } from '@dreamit/funpara'

function createISOTimestamp(
    dateFunction: DateFunction = nowDateFunction(),
): string {
    return dateFunction().toISOString()
}

export { createISOTimestamp }
