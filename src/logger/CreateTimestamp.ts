import { nowDateFunction } from '@dreamit/funpara'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import type { DateFunction } from '@dreamit/funpara'

function createISOTimestamp(
    dateFunction: DateFunction = nowDateFunction(),
): string {
    return dateFunction().toISOString()
}

export { createISOTimestamp }
