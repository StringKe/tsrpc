export function binarySearch<T>(
    array: T[],
    value: number | string,
    keyMapper?: (v: T) => number | string,
): number {
    let low = 0,
        high = array.length - 1

    while (low <= high) {
        const mid = ((high + low) / 2) | 0
        const midValue = keyMapper ? keyMapper(array[mid]) : array[mid]
        if (value === midValue) {
            return mid
        } else if (value > midValue) {
            low = mid + 1
        } else if (value < midValue) {
            high = mid - 1
        }
    }
    return -1
}

export function binaryInsert<T>(array: T[], item: T, unique?: boolean): number
export function binaryInsert<T>(
    array: T[],
    item: T,
    keyMapper?: ((v: T) => number | string) | boolean,
    unique?: boolean,
): number {
    if (typeof keyMapper == 'boolean') {
        unique = keyMapper
        keyMapper = undefined
    }

    let low = 0,
        high = array.length - 1
    let mid = NaN
    const itemValue = keyMapper ? keyMapper(item) : item

    while (low <= high) {
        mid = ((high + low) / 2) | 0
        const midValue = keyMapper ? keyMapper(array[mid]) : array[mid]
        if (itemValue === midValue) {
            if (unique) {
                return mid
            } else {
                break
            }
        } else if (itemValue > midValue) {
            low = mid + 1
        } else if (itemValue < midValue) {
            high = mid - 1
        }
    }
    const index = low > mid ? mid + 1 : mid
    array.splice(index, 0, item)
    return index
}

export function binaryDistinct<T>(
    array: T[],
    keyMapper?: (v: T) => number | string,
): T[] {
    return array.filter(
        (v: any, i: number, arr: any[]) =>
            binarySearch(arr, v, keyMapper) === i,
    )
}

function prependZero(matched: string, num: number) {
    return matched.length > 1 && num < 10 ? `0${num}` : `${num}`
}

export function dateFormat(date: Date, format = 'YYYY-MM-DD hh:mm:ss') {
    return format
        .replace(/y{2,}|Y{2,}/, (v) =>
            (date.getFullYear() + '').substr(4 - v.length),
        )
        .replace(/M{1,2}/, (v) => prependZero(v, date.getMonth() + 1))
        .replace(/D{1,2}|d{1,2}/, (v) => prependZero(v, date.getDate()))
        .replace(/Q|q/, (v) =>
            prependZero(v, Math.ceil((date.getMonth() + 1) / 3)),
        )
        .replace(/h{1,2}|H{1,2}/, (v) => prependZero(v, date.getHours()))
        .replace(/m{1,2}/, (v) => prependZero(v, date.getMinutes()))
        .replace(/s{1,2}/, (v) => prependZero(v, date.getSeconds()))
        .replace(/SSS|S/, (v) => {
            const ms = '' + date.getMilliseconds()
            return v.length === 1
                ? ms
                : `${ms.length === 1 ? '00' : ms.length === 2 ? '0' : ''}${ms}`
        })
}
