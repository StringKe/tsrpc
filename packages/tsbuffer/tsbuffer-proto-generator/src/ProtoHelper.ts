import { remove } from 'lodash'

import {
    InterfaceReference,
    InterfaceTypeSchema,
    IntersectionTypeSchema,
    OmitTypeSchema,
    OverwriteTypeSchema,
    PartialTypeSchema,
    PickTypeSchema,
    ReferenceTypeSchema,
    SchemaType,
    TSBufferProto,
    TSBufferSchema,
    TypeReference,
    UnionTypeSchema,
} from '@ntsrpc/tsbuffer-schema'
import { binaryInsert } from '@ntsrpc/utils'

export class ProtoHelper {
    readonly proto: TSBufferProto

    constructor(proto: TSBufferProto) {
        this.proto = proto
    }

    parseReference(
        schema: TSBufferSchema,
    ): Exclude<TSBufferSchema, TypeReference> {
        // Reference
        if (schema.type === SchemaType.Reference) {
            const parsedSchema = this.proto[schema.target]
            if (!parsedSchema) {
                throw new Error(
                    `Cannot find reference target: ${schema.target}`,
                )
            }

            if (this.isTypeReference(parsedSchema)) {
                return this.parseReference(parsedSchema)
            } else {
                return parsedSchema
            }
        }
        // IndexedAccess
        else if (schema.type === SchemaType.IndexedAccess) {
            if (!this.isInterface(schema.objectType)) {
                throw new Error(
                    `Error objectType: ${(schema.objectType as any).type}`,
                )
            }

            // find prop item
            const flat = this.getFlatInterfaceSchema(schema.objectType)
            const propItem = flat.properties!.find(
                (v) => v.name === schema.index,
            )
            let propType: TSBufferSchema
            if (propItem) {
                propType = propItem.type
            } else {
                if (flat.indexSignature) {
                    propType = flat.indexSignature.type
                } else {
                    throw new Error(`Error index: ${schema.index}`)
                }
            }

            // optional -> | undefined
            if (
                propItem &&
                propItem.optional && // ??????????????????optional
                (propItem.type.type !== SchemaType.Union || // ????????????Union
                    // ????????????Union????????????undefined????????????
                    propItem.type.members.findIndex(
                        (v) =>
                            v.type.type === SchemaType.Literal &&
                            v.type.literal === undefined,
                    ) === -1)
            ) {
                propType = {
                    type: SchemaType.Union,
                    members: [
                        { id: 0, type: propType },
                        {
                            id: 1,
                            type: {
                                type: SchemaType.Literal,
                                literal: undefined,
                            },
                        },
                    ],
                }
            }

            return this.isTypeReference(propType)
                ? this.parseReference(propType)
                : propType
        } else if (schema.type === SchemaType.Keyof) {
            if (!this.isInterface(schema.target)) {
                throw new Error(
                    'Invalid keyof target type: ' +
                        (schema.target as TSBufferSchema).type,
                )
            }
            const flatInterface = this.getFlatInterfaceSchema(schema.target)
            return {
                type: SchemaType.Union,
                members: flatInterface.properties.map((v, i) => ({
                    id: i,
                    type: {
                        type: SchemaType.Literal,
                        literal: v.name,
                    },
                })),
            }
        } else {
            return schema
        }
    }

    isInterface(
        schema: TSBufferSchema,
        excludeReference = false,
    ): schema is InterfaceTypeSchema | InterfaceReference {
        if (!excludeReference && this.isTypeReference(schema)) {
            const parsed = this.parseReference(schema)
            return this.isInterface(parsed, excludeReference)
        } else {
            return (
                schema.type === SchemaType.Interface ||
                schema.type === SchemaType.Pick ||
                schema.type === SchemaType.Partial ||
                schema.type === SchemaType.Omit ||
                schema.type === SchemaType.Overwrite
            )
        }
    }

    isTypeReference(schema: TSBufferSchema): schema is TypeReference {
        return (
            schema.type === SchemaType.Reference ||
            schema.type === SchemaType.IndexedAccess
        )
    }

    getUnionProperties(schema: UnionTypeSchema | IntersectionTypeSchema) {
        return this._addUnionProperties(
            [],
            schema.members.map((v) => v.type),
        )
    }

    /**
     * ???unionProperties ????????? InterfaceTypeSchema??????optional???any?????????
     * ??????????????????????????????????????????Intersection/Union???
     */
    applyUnionProperties(
        schema: FlatInterfaceTypeSchema,
        unionProperties: string[],
    ): FlatInterfaceTypeSchema {
        const newSchema: FlatInterfaceTypeSchema = {
            ...schema,
            properties: schema.properties.slice(),
        }

        for (const prop of unionProperties) {
            if (prop === '[[String]]') {
                newSchema.indexSignature = newSchema.indexSignature || {
                    keyType: SchemaType.String,
                    type: { type: SchemaType.Any },
                }
            } else if (prop === '[[Number]]') {
                newSchema.indexSignature = newSchema.indexSignature || {
                    keyType: SchemaType.Number,
                    type: { type: SchemaType.Any },
                }
            } else if (!schema.properties.find((v) => v.name === prop)) {
                newSchema.properties.push({
                    id: -1,
                    name: prop,
                    optional: true,
                    type: {
                        type: SchemaType.Any,
                    },
                })
            }
        }

        return newSchema
    }

    /**
     * ???interface??????????????????????????????schema
     */
    getFlatInterfaceSchema(
        schema: InterfaceTypeSchema | InterfaceReference,
    ): FlatInterfaceTypeSchema {
        if (this.isTypeReference(schema)) {
            const parsed = this.parseReference(schema)
            if (parsed.type !== SchemaType.Interface) {
                throw new Error(
                    `Cannot flatten non interface type: ${parsed.type}`,
                )
            }
            return this.getFlatInterfaceSchema(parsed)
        } else if (schema.type === SchemaType.Interface) {
            return this._flattenInterface(schema)
        } else {
            return this._flattenMappedType(schema)
        }
    }

    parseMappedType(
        schema:
            | PickTypeSchema
            | OmitTypeSchema
            | PartialTypeSchema
            | OverwriteTypeSchema,
    ): InterfaceTypeSchema | UnionTypeSchema {
        const parents: (
            | PickTypeSchema
            | OmitTypeSchema
            | PartialTypeSchema
            | OverwriteTypeSchema
        )[] = []
        let child: TSBufferSchema = schema
        do {
            parents.push(child)
            child = this.parseReference(child.target)
        } while (
            child.type === SchemaType.Pick ||
            child.type === SchemaType.Omit ||
            child.type === SchemaType.Partial ||
            child.type === SchemaType.Overwrite
        )

        // Final
        if (child.type === SchemaType.Interface) {
            return child
        }
        // PickOmit<A|B> === PickOmit<A> | PickOmit<B>
        else if (child.type === SchemaType.Union) {
            return {
                type: SchemaType.Union,
                members: child.members.map((v) => {
                    // ??????????????????
                    let type: TSBufferSchema = v.type
                    for (let i = parents.length - 1; i > -1; --i) {
                        const parent = parents[i]
                        type = {
                            ...parent,
                            target: type,
                        } as PickTypeSchema | OmitTypeSchema
                    }

                    return {
                        id: v.id,
                        type: type,
                    }
                }),
            }
        } else {
            throw new Error(`Unsupported pattern ${schema.type}<${child.type}>`)
        }
    }

    /**
     * unionProperties: ???Union???Intersection???????????????????????????member????????????
     */
    private _addUnionProperties(
        unionProperties: string[],
        schemas: TSBufferSchema[],
    ): string[] {
        for (let i = 0, len = schemas.length; i < len; ++i) {
            const schema = this.parseReference(schemas[i])

            // Interface??????Ref ??????interfaces
            if (this.isInterface(schema)) {
                const flat = this.getFlatInterfaceSchema(schema)
                flat.properties.forEach((v) => {
                    binaryInsert(unionProperties, v.name, true)
                })

                if (flat.indexSignature) {
                    const key = `[[${flat.indexSignature.keyType}]]`
                    binaryInsert(unionProperties, key, true)
                }
            }
            // Intersection/Union ????????????unionProperties
            else if (
                schema.type === SchemaType.Intersection ||
                schema.type === SchemaType.Union
            ) {
                this._addUnionProperties(
                    unionProperties,
                    schema.members.map((v) => v.type),
                )
            }
        }
        return unionProperties
    }

    /**
     * ??????interface
     */
    private _flattenInterface(
        schema: InterfaceTypeSchema,
    ): FlatInterfaceTypeSchema {
        const properties: {
            [name: string]: {
                optional?: boolean
                type: TSBufferSchema
            }
        } = {}
        let indexSignature: InterfaceTypeSchema['indexSignature']

        // ???????????????properties???indexSignature???????????????
        if (schema.properties) {
            for (const prop of schema.properties) {
                properties[prop.name] = {
                    optional: prop.optional,
                    type: prop.type,
                }
            }
        }
        if (schema.indexSignature) {
            indexSignature = schema.indexSignature
        }

        // extends????????????????????????????????????????????????
        if (schema.extends) {
            for (const extend of schema.extends) {
                // ?????????
                const parsedExtRef = this.parseReference(extend.type)
                if (parsedExtRef.type !== SchemaType.Interface) {
                    throw new Error(
                        'SchemaError: extends must from interface but from ' +
                            parsedExtRef.type,
                    )
                }
                // ????????????extends
                const flatenExtendsSchema =
                    this.getFlatInterfaceSchema(parsedExtRef)

                // properties
                if (flatenExtendsSchema.properties) {
                    for (const prop of flatenExtendsSchema.properties) {
                        if (!properties[prop.name]) {
                            properties[prop.name] = {
                                optional: prop.optional,
                                type: prop.type,
                            }
                        }
                    }
                }

                // indexSignature
                if (flatenExtendsSchema.indexSignature && !indexSignature) {
                    indexSignature = flatenExtendsSchema.indexSignature
                }
            }
        }

        return {
            type: SchemaType.Interface,
            properties: Object.entries(properties).map((v, i) => ({
                id: i,
                name: v[0],
                optional: v[1].optional,
                type: v[1].type,
            })),
            indexSignature: indexSignature,
        }
    }

    /** ???MappedTypeSchema??????????????????Interface
     */
    private _flattenMappedType(
        schema:
            | PickTypeSchema
            | PartialTypeSchema
            | OverwriteTypeSchema
            | OmitTypeSchema,
    ): FlatInterfaceTypeSchema {
        // target ?????????
        let target: Exclude<PickTypeSchema['target'], ReferenceTypeSchema>
        if (this.isTypeReference(schema.target)) {
            const parsed = this.parseReference(schema.target)
            target = parsed as typeof target
        } else {
            target = schema.target
        }

        let flatTarget: FlatInterfaceTypeSchema
        // ???????????????MappedType ?????????
        if (
            target.type === SchemaType.Pick ||
            target.type === SchemaType.Partial ||
            target.type === SchemaType.Omit ||
            target.type === SchemaType.Overwrite
        ) {
            flatTarget = this._flattenMappedType(target)
        } else if (target.type === SchemaType.Interface) {
            flatTarget = this._flattenInterface(target)
        } else {
            throw new Error(`Invalid target.type: ${target.type}`)
        }

        // ????????????Mapped??????
        if (schema.type === SchemaType.Pick) {
            const properties: NonNullable<InterfaceTypeSchema['properties']> =
                []
            for (const key of schema.keys) {
                const propItem = flatTarget.properties.find(
                    (v) => v.name === key,
                )
                if (propItem) {
                    properties.push({
                        id: properties.length,
                        name: key,
                        optional: propItem.optional,
                        type: propItem.type,
                    })
                } else if (flatTarget.indexSignature) {
                    properties.push({
                        id: properties.length,
                        name: key,
                        type: flatTarget.indexSignature.type,
                    })
                } else {
                    throw new Error(`Cannot find pick key [${key}]`)
                }
            }
            return {
                type: SchemaType.Interface,
                properties: properties,
            }
        } else if (schema.type === SchemaType.Partial) {
            for (const v of flatTarget.properties) {
                v.optional = true
            }
            return flatTarget
        } else if (schema.type === SchemaType.Omit) {
            for (const key of schema.keys) {
                remove(flatTarget.properties, (v) => v.name === key)
            }
            return flatTarget
        } else if (schema.type === SchemaType.Overwrite) {
            const overwrite = this.getFlatInterfaceSchema(schema.overwrite)
            if (overwrite.indexSignature) {
                flatTarget.indexSignature = overwrite.indexSignature
            }
            for (const prop of overwrite.properties) {
                remove(flatTarget.properties, (v) => v.name === prop.name)
                flatTarget.properties.push(prop)
            }
            return flatTarget
        } else {
            throw new Error(`Unknown type: ${schema['type']}`)
        }
    }
}

export interface FlatInterfaceTypeSchema {
    type: InterfaceTypeSchema['type']
    properties: NonNullable<InterfaceTypeSchema['properties']>
    indexSignature?: InterfaceTypeSchema['indexSignature']
}
