import { BaseSchema } from '../BaseSchema'

/**
 * JavaScript `Date` type
 *
 * @example
 * ```ts
 * type A = Date;
 * ```
 */
export interface DateTypeSchema extends BaseSchema {
    type: 'Date'
}
