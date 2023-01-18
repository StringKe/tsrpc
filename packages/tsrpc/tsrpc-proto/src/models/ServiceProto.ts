import { TSBufferProto } from '@ntsrpc/tsbuffer-schema'

import { BaseServiceType } from './BaseServiceType'





export interface BaseServiceDef {
    id: number
    name: string
}

/**
 * Send request and wait for response
 * @remarks
 * SchemaId of request and ressponse is generated by client, named with the prefix `Req` or `Res`.
 */
export interface ApiServiceDef extends BaseServiceDef {
    type: 'api'
    /**
     * Auto generated by `tsrpc-cli`
     * @example
     * ```ts title="PtlAddComment.ts"
     * export interface ReqAddComment {
     *     articleId: string;
     *     comment: string;
     * }
     *
     * export interface ResAddComment {
     *     commentId: string;
     * }
     *
     * // This would be auto generated to `service.conf`
     * export const conf = {
     *     needLogin: true,
     *     needRoles: ['SuperAdmin', 'ArticleAdmin', 'CommentAdmin']
     * };
     * ```
     */
    conf?: {
        [key: string]: any
    }
}

/**
 * Send or listen specific data, without waiting for response.
 */
export interface MsgServiceDef extends BaseServiceDef {
    type: 'msg'
    conf?: {
        [key: string]: any
    }
}

export type ServiceDef = ApiServiceDef | MsgServiceDef

/**
 * TSRPC Server Protocol Definitions
 * @typeParam ServiceType - API request and response types, and Msg types.
 */
export interface ServiceProto<ServiceType extends BaseServiceType = any> {
    version?: number

    /**
     * Service is the basic interactive unit for server and client.
     * Include {@link ApiServiceDef} and {@link MsgServiceDef}.
     */
    services: ServiceDef[]

    /**
     * `TSBufferProto` that includes all types used by the services.
     * @see
     * {@link tsbuffer-schema#TSBufferProto | TSBufferProto}
     * {@link tsbuffer-schema#TSBufferSchema | TSBufferSchema}
     */
    types: TSBufferProto

    /** For IntelliSense in VSCode */
    __SERVICE_TYPE__?: ServiceType
}
