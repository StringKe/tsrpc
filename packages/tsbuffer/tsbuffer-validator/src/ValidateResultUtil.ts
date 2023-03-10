import { TSBufferSchema } from '@ntsrpc/tsbuffer-schema'

import { ErrorMsg, ErrorType } from './ErrorMsg'
import { ValidateOutput } from './types'

/** @internal */
export interface ValidateResultSucc {
    isSucc: true
    errMsg?: undefined
    error?: undefined
}

/** @internal */
export class ValidateResultError<T extends ErrorType = ErrorType> {
    readonly isSucc: boolean = false

    // Atom Error
    error: {
        type: T
        params: Parameters<(typeof ErrorMsg)[T]> // Error is from inner
        inner?: {
            property: string[]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            value: any
            schema: TSBufferSchema
        }
    }

    constructor(error: ValidateResultError<T>['error']) {
        this.error = error
    }

    get errMsg(): string {
        return ValidateResultError.getErrMsg(this.error)
    }

    static getErrMsg<T extends keyof typeof ErrorMsg>(
        error: ValidateResultError<T>['error'],
    ) {
        const errMsg = (ErrorMsg[error.type] as (...args: unknown[]) => string)(
            ...error.params,
        )

        if (error.inner?.property.length) {
            return `Property \`${error.inner.property.join('.')}\`: ${errMsg}`
        } else {
            return errMsg
        }
    }
}

/** @internal  */
export type ValidateResult = ValidateResultSucc | ValidateResultError

/** @internal  */
export class ValidateResultUtil {
    static readonly succ: ValidateResultSucc = { isSucc: true }

    static error<T extends ErrorType>(
        type: T,
        ...params: Parameters<(typeof ErrorMsg)[T]>
    ): ValidateResultError {
        return new ValidateResultError({
            type: type,
            params: params,
        })
    }

    static isNotSucc(
        result: ValidateOutput | ValidateResultError,
    ): result is ValidateResultError {
        return !result.isSucc
    }

    static innerError(
        property: string | string[], // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        schema: TSBufferSchema,
        error: ValidateResultError,
    ): ValidateResultError {
        if (error.error.inner) {
            if (typeof property === 'string') {
                error.error.inner.property.unshift(property)
            } else {
                error.error.inner.property.unshift(...property)
            }
        } else {
            error.error.inner = {
                property: typeof property === 'string' ? [property] : property,
                value: value,
                schema: schema,
            }
        }

        return error
    }
}
