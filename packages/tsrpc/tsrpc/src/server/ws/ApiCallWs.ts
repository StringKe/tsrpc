import { ApiReturn, BaseServiceType } from '@ntsrpc/tsrpc-proto'

import { ApiCall, ApiCallOptions } from '../base/ApiCall'
import { ConnectionStatus } from '../base/BaseConnection'
import { WsConnection } from './WsConnection'

export interface ApiCallWsOptions<Req, ServiceType extends BaseServiceType>
    extends ApiCallOptions<Req, ServiceType> {
    conn: WsConnection<ServiceType>
}

export class ApiCallWs<
    Req = any,
    Res = any,
    ServiceType extends BaseServiceType = any,
> extends ApiCall<Req, Res, ServiceType> {
    override readonly conn!: WsConnection<ServiceType>

    constructor(options: ApiCallWsOptions<Req, ServiceType>) {
        super(options)
    }

    protected override async _prepareReturn(
        ret: ApiReturn<Res>,
    ): Promise<void> {
        if (this.conn.status !== ConnectionStatus.Opened) {
            this.logger.error('[SendReturnErr]', 'WebSocket is not opened', ret)
            this._return = ret
            return
        }

        return super._prepareReturn(ret)
    }
}
