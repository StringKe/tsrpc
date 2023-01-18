import { BaseSchema } from '../BaseSchema'
import { InterfaceReference } from '../models/InterfaceReference'

/**
 * TypeScript `keyof` feature, to get keys of an interface.
 *
 * @remarks
 * Type:
 * ```ts
 * interface ABC { a: string; b: string }
 * type Keys = keyof ABC;
 * ```
 *
 * Schema:
 * ```json
 * {
 *     type: "keys",
 *     target: {
 *         type: "Reference",
 *         target: "ABC"
 *     }
 * }
 * ```
 */
export interface KeyofTypeSchema extends BaseSchema {
    type: 'Keyof'
    target: InterfaceReference
}
