import { BaseSchema } from '../BaseSchema'
import { TSBufferSchema } from '../models/TSBufferSchema'

/**
 * TypeScript `Tuple` type
 *
 * @remarks
 * It has less encoded size than `Array`.
 *
 * See: {@link https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types}
 */
export interface TupleTypeSchema extends BaseSchema {
    type: 'Tuple'
    elementTypes: TSBufferSchema[]
    optionalStartIndex?: number
}
