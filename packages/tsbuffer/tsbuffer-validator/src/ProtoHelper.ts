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
    private _schemaWithUuids: (TSBufferSchema & { uuid: number })[] = []
    private _unionPropertiesCache: { [uuid: number]: string[] } = {}
    private _flatInterfaceSchemaCache: {
        [uuid: number]: FlatInterfaceTypeSchema
    } = {}

    constructor(proto: TSBufferProto) {
        this.proto = proto
    }

    /** 将ReferenceTypeSchema层层转换为它最终实际引用的类型 */
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
                    `Error objectType: ${schema.objectType['type']}`,
                )
            }

            // find prop item
            const flat = this.getFlatInterfaceSchema(schema.objectType)
            const propItem = flat.properties.find(
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
                propItem.optional && // 引用的字段是optional
                (propItem.type.type !== SchemaType.Union || // 自身不为Union
                    // 或自身为Union，但没有undefined成员条件
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
                (this.isMappedType(schema) &&
                    this.parseMappedType(schema).type === SchemaType.Interface)
            )
        }
    }

    isMappedType(
        schema: TSBufferSchema,
    ): schema is Exclude<InterfaceReference, TypeReference> {
        return (
            schema.type === SchemaType.Pick ||
            schema.type === SchemaType.Partial ||
            schema.type === SchemaType.Omit ||
            schema.type === SchemaType.Overwrite
        )
    }

    isTypeReference(schema: TSBufferSchema): schema is TypeReference {
        return (
            schema.type === SchemaType.Reference ||
            schema.type === SchemaType.IndexedAccess ||
            schema.type === SchemaType.Keyof
        )
    }

    getUnionProperties(schema: UnionTypeSchema | IntersectionTypeSchema) {
        const uuid = this._getSchemaUuid(schema)
        if (!this._unionPropertiesCache[uuid]) {
            this._unionPropertiesCache[uuid] = this._addUnionProperties(
                [],
                schema.members.map((v) => v.type),
            )
        }
        return this._unionPropertiesCache[uuid]
    }

    /**
     * 将unionProperties 扩展到 InterfaceTypeSchema中（optional的any类型）
     * 以此来跳过对它们的检查（用于Intersection/Union）
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
     * 将interface及其引用转换为展平的schema
     */
    getFlatInterfaceSchema(
        schema: InterfaceTypeSchema | InterfaceReference,
    ): FlatInterfaceTypeSchema {
        const uuid = this._getSchemaUuid(schema)

        // from cache
        if (this._flatInterfaceSchemaCache[uuid]) {
            return this._flatInterfaceSchemaCache[uuid]
        }

        if (this.isTypeReference(schema)) {
            const parsed = this.parseReference(schema)
            if (parsed.type !== SchemaType.Interface) {
                throw new Error(
                    `Cannot flatten non interface type: ${parsed.type}`,
                )
            }
            this._flatInterfaceSchemaCache[uuid] =
                this.getFlatInterfaceSchema(parsed)
        } else if (schema.type === SchemaType.Interface) {
            this._flatInterfaceSchemaCache[uuid] =
                this._flattenInterface(schema)
        } else if (this.isMappedType(schema)) {
            this._flatInterfaceSchemaCache[uuid] =
                this._flattenMappedType(schema)
        } else {
            throw new Error('Invalid interface type: ' + schema['type'])
        }

        return this._flatInterfaceSchemaCache[uuid]
    }

    parseMappedType(
        schema:
            | PickTypeSchema
            | OmitTypeSchema
            | PartialTypeSchema
            | OverwriteTypeSchema,
    ): InterfaceTypeSchema | UnionTypeSchema | IntersectionTypeSchema {
        // 解嵌套，例如：Pick<Pick<Omit, XXX, 'a'|'b'>>>
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
        } while (this.isMappedType(child))

        // 最内层是 interface，直接返回（validator 会验证 key 匹配）
        if (child.type === SchemaType.Interface) {
            return child
        }
        // PickOmit<A|B> === PickOmit<A> | PickOmit<B>
        else if (
            child.type === SchemaType.Union ||
            child.type === SchemaType.Intersection
        ) {
            return {
                type: child.type,
                members: child.members.map((v) => {
                    // 从里面往外装
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

    private _getSchemaUuid(schema: TSBufferSchema) {
        const schemaWithUuid: TSBufferSchema & { uuid?: number } = schema
        if (!schemaWithUuid.uuid) {
            schemaWithUuid.uuid = this._schemaWithUuids.push(
                schemaWithUuid as TSBufferSchema & { uuid: number },
            )
        }
        return schemaWithUuid.uuid
    }

    /**
     * unionProperties: 在Union或Intersection类型中，出现在任意member中的字段
     */
    private _addUnionProperties(
        unionProperties: Array<string>,
        schemas: TSBufferSchema[],
    ): string[] {
        for (let i = 0, len = schemas.length; i < len; ++i) {
            const schema = this.parseReference(schemas[i])

            // Interface及其Ref 加入interfaces
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
            // Intersection/Union 递归合并unionProperties
            else if (
                schema.type === SchemaType.Intersection ||
                schema.type === SchemaType.Union
            ) {
                this._addUnionProperties(
                    unionProperties,
                    schema.members.map((v) => v.type),
                )
            } else if (this.isMappedType(schema)) {
                this._addUnionProperties(unionProperties, [
                    this.parseMappedType(schema),
                ])
            }
        }
        return unionProperties
    }

    /**
     * 展平interface
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

        // 自身定义的properties和indexSignature优先级最高
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

        // extends的优先级次之，补全没有定义的字段
        if (schema.extends) {
            for (const extend of schema.extends) {
                // 解引用
                let parsedExtRef = this.parseReference(extend.type)
                if (this.isMappedType(parsedExtRef)) {
                    parsedExtRef = this._flattenMappedType(parsedExtRef)
                }

                if (!this.isInterface(parsedExtRef)) {
                    throw new Error(
                        'SchemaError: extends must from interface but from ' +
                            parsedExtRef.type,
                    )
                }

                // 递归展平extends
                const flattenExtendsSchema =
                    this.getFlatInterfaceSchema(parsedExtRef)

                // properties
                if (flattenExtendsSchema.properties) {
                    for (const prop of flattenExtendsSchema.properties) {
                        if (!properties[prop.name]) {
                            properties[prop.name] = {
                                optional: prop.optional,
                                type: prop.type,
                            }
                        }
                    }
                }

                // indexSignature
                if (flattenExtendsSchema.indexSignature && !indexSignature) {
                    indexSignature = flattenExtendsSchema.indexSignature
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

    /** 将MappedTypeSchema转换为展平的Interface
     */
    private _flattenMappedType(
        schema:
            | PickTypeSchema
            | PartialTypeSchema
            | OverwriteTypeSchema
            | OmitTypeSchema,
    ): FlatInterfaceTypeSchema {
        // target 解引用
        let target: Exclude<PickTypeSchema['target'], ReferenceTypeSchema>
        if (this.isTypeReference(schema.target)) {
            const parsed = this.parseReference(schema.target)
            target = parsed as typeof target
        } else {
            target = schema.target
        }

        let flatTarget: FlatInterfaceTypeSchema
        // 内层仍然为MappedType 递归之
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

        // 开始执行Mapped逻辑
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

/** @public */
export interface FlatInterfaceTypeSchema {
    type: InterfaceTypeSchema['type']
    properties: NonNullable<InterfaceTypeSchema['properties']>
    indexSignature?: InterfaceTypeSchema['indexSignature']
}
