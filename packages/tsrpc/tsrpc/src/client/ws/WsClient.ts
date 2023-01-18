import { BaseWsClient, BaseWsClientOptions, defaultBaseWsClientOptions } from '@ntsrpc/tsrpc-base-client';
import { BaseServiceType, ServiceProto } from '@ntsrpc/tsrpc-proto';



import { getClassObjectId } from '../../models/getClassObjectId';
import { WebSocketProxy } from './WebSocketProxy';





/**
 * Client for TSRPC WebSocket Server.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
export class WsClient<
    ServiceType extends BaseServiceType,
> extends BaseWsClient<ServiceType> {
    override readonly options!: Readonly<WsClientOptions>

    constructor(
        proto: ServiceProto<ServiceType>,
        options?: Partial<WsClientOptions>,
    ) {
        const wsp = new WebSocketProxy()
        super(proto, wsp, {
            customObjectIdClass: getClassObjectId(),
            ...defaultWsClientOptions,
            ...options,
        })
    }
}

const defaultWsClientOptions: WsClientOptions = {
    ...defaultBaseWsClientOptions,
}

export type WsClientOptions = BaseWsClientOptions
