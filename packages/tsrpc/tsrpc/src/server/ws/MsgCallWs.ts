import { BaseServiceType } from '@ntsrpc/tsrpc-proto'

import { MsgCall, MsgCallOptions } from '../base/MsgCall'
import { WsConnection } from './WsConnection'





export interface MsgCallWsOptions<Msg, ServiceType extends BaseServiceType>
    extends MsgCallOptions<Msg, ServiceType> {
    conn: WsConnection<ServiceType>
}

export class MsgCallWs<
    Msg = any,
    ServiceType extends BaseServiceType = any,
> extends MsgCall<Msg, ServiceType> {
    override readonly conn!: WsConnection<ServiceType>

    constructor(options: MsgCallWsOptions<Msg, ServiceType>) {
        super(options)
    }
}
