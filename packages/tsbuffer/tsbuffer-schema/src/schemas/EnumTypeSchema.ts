import { BaseSchema } from '../BaseSchema'





/**
 * TypeScript `enum` type
 *
 * @remarks
 * See: {@link https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#enums}
 *
 * @example
 * ```ts
 * enum JobName {
 *     Teacher,
 *     Doctor,
 *     Salesman
 * }
 *
 * enum Status {
 *     Normal = 'Normal',
 *     Expired = 'Expired'
 * }
 * ```
 */
export interface EnumTypeSchema extends BaseSchema {
    type: 'Enum'
    members: {
        /** Encoding identifier, generated according to the order */
        id: number
        value: string | number
    }[]
}
