import {
    BaseWsClient,
    BaseWsClientOptions,
    defaultBaseWsClientOptions,
} from '@ntsrpc/tsrpc-base-client'
import { BaseServiceType, ServiceProto } from '@ntsrpc/tsrpc-proto'

import { WebSocketProxy } from './WebSocketProxy'

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
            ...defaultWsClientOptions,
            ...options,
        })

        if (!this.options.miniappObj) {
            throw new Error('options.miniappObj is not set')
        }
        wsp.miniappObj = this.options.miniappObj
        wsp.client = this
    }
}

const defaultWsClientOptions: WsClientOptions = {
    ...defaultBaseWsClientOptions,
    miniappObj: typeof wx !== 'undefined' ? wx : (undefined as any),
    customObjectIdClass: String,
}

export interface WsClientOptions extends BaseWsClientOptions {
    /**
     * MiniApp API Object
     * Wechat: wx
     * QQ MiniApp: qq
     * ByteDance MiniApp: tt
     */
    miniappObj: any
    /** Extra options to wx.connectSocket */
    connectSocketOptions?: object
}
