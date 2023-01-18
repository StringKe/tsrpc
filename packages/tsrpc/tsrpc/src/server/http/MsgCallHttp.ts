import { BaseServiceType } from '@ntsrpc/tsrpc-proto'

import { MsgCall, MsgCallOptions } from '../base/MsgCall'
import { HttpConnection } from './HttpConnection'





export interface MsgCallHttpOptions<Msg, ServiceType extends BaseServiceType>
    extends MsgCallOptions<Msg, ServiceType> {
    conn: HttpConnection<ServiceType>
}

export class MsgCallHttp<
    Msg = any,
    ServiceType extends BaseServiceType = any,
> extends MsgCall<Msg, ServiceType> {
    override readonly conn!: HttpConnection<ServiceType>

    constructor(options: MsgCallHttpOptions<Msg, ServiceType>) {
        super(options)
    }
}
