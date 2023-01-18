/* eslint-disable @typescript-eslint/no-explicit-any */

import './ExtendNativeType'

export type Overwrite<T, U> = T extends unknown
    ? Pick<T, Exclude<keyof T, keyof U>> & U
    : never
export type PickUnion<T, U extends keyof T> = T extends unknown
    ? Pick<T, U>
    : never
export type OmitUnion<T, U extends keyof T> = T extends unknown
    ? Omit<T, U>
    : never
export type PartialUnion<T> = T extends unknown ? Partial<T> : never

Object.defineProperties(Array.prototype, {
    binarySearch: {
        value: function (
            this: any[],
            value: number | string,
            keyMapper?: (v: any) => number | string,
        ): number {
            let low = 0,
                high = this.length - 1

            while (low <= high) {
                const mid = ((high + low) / 2) | 0
                const midValue = keyMapper ? keyMapper(this[mid]) : this[mid]
                if (value === midValue) {
                    return mid
                } else if (value > midValue) {
                    low = mid + 1
                } else if (value < midValue) {
                    high = mid - 1
                }
            }
            return -1
        },
        writable: true,
    },
    binaryInsert: {
        value: function (
            this: any[],
            item: any,
            keyMapper?: any,
            unique?: boolean,
        ): number {
            if (typeof keyMapper == 'boolean') {
                unique = keyMapper
                keyMapper = undefined
            }

            let low = 0,
                high = this.length - 1
            let mid = NaN
            const itemValue = keyMapper ? keyMapper(item) : item

            while (low <= high) {
                mid = ((high + low) / 2) | 0
                const midValue = keyMapper ? keyMapper(this[mid]) : this[mid]
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
            this.splice(index, 0, item)
            return index
        },
        writable: true,
    },
    binaryDistinct: {
        value: function (this: any[], keyMapper?: (v: any) => number | string) {
            return this.filter(
                (v: any, i: number, arr: any[]) =>
                    arr.binarySearch(v, keyMapper) === i,
            )
        },
        writable: true,
    },
})

//应对IE9以下没有console
if (typeof window != 'undefined' && !window.console) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window['console'] = {
        log: function () {
            // nothing
        },
        info: function () {
            // nothing
        },
        warn: function () {
            // nothing
        },
        error: function () {
            // nothing
        },
        debug: function () {
            // nothing
        },
    }
}

// 应对某些浏览器没有console.debug的情况
if (!console.debug) {
    Object.defineProperty(console, 'debug', {
        value: console.log,
        writable: false,
    })
}

function prependZero(matched: string, num: number) {
    return matched.length > 1 && num < 10 ? `0${num}` : `${num}`
}

Object.defineProperties(Date.prototype, {
    format: {
        value: function (this: Date, format = 'YYYY-MM-DD hh:mm:ss') {
            return format
                .replace(/y{2,}|Y{2,}/, (v) =>
                    (this.getFullYear() + '').substr(4 - v.length),
                )
                .replace(/M{1,2}/, (v) => prependZero(v, this.getMonth() + 1))
                .replace(/D{1,2}|d{1,2}/, (v) => prependZero(v, this.getDate()))
                .replace(/Q|q/, (v) =>
                    prependZero(v, Math.ceil((this.getMonth() + 1) / 3)),
                )
                .replace(/h{1,2}|H{1,2}/, (v) =>
                    prependZero(v, this.getHours()),
                )
                .replace(/m{1,2}/, (v) => prependZero(v, this.getMinutes()))
                .replace(/s{1,2}/, (v) => prependZero(v, this.getSeconds()))
                .replace(/SSS|S/, (v) => {
                    const ms = '' + this.getMilliseconds()
                    return v.length === 1
                        ? ms
                        : `${
                              ms.length === 1
                                  ? '00'
                                  : ms.length === 2
                                  ? '0'
                                  : ''
                          }${ms}`
                })
        },
    },
})

Date.today = function () {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}
