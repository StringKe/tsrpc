import { OmitTypeSchema } from '../schemas/OmitTypeSchema'
import { OverwriteTypeSchema } from '../schemas/OverwriteTypeSchema'
import { PartialTypeSchema } from '../schemas/PartialTypeSchema'
import { PickTypeSchema } from '../schemas/PickTypeSchema'
import { TypeReference } from './TypeReference'

export type InterfaceReference =
    | TypeReference
    | PickTypeSchema
    | PartialTypeSchema
    | OverwriteTypeSchema
    | OmitTypeSchema
