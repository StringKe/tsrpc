import { ApiReturn, BaseServiceType } from '@ntsrpc/tsrpc-proto'

import { ApiCall, ApiCallOptions } from '../base/ApiCall'
import { InnerConnection } from './InnerConnection'

export interface ApiCallInnerOptions<Req, ServiceType extends BaseServiceType>
    extends ApiCallOptions<Req, ServiceType> {
    conn: InnerConnection<ServiceType>
}

export class ApiCallInner<
    Req = any,
    Res = any,
    ServiceType extends BaseServiceType = any,
> extends ApiCall<Req, Res, ServiceType> {
    override readonly conn!: InnerConnection<ServiceType>

    constructor(options: ApiCallInnerOptions<Req, ServiceType>) {
        super(options)
    }

    protected override async _sendReturn(
        ret: ApiReturn<Res>,
    ): Promise<{ isSucc: true } | { isSucc: false; errMsg: string }> {
        if (this.conn.return.type === 'raw') {
            // Validate Res
            if (ret.isSucc) {
                const resValidate = this.server.tsbuffer.validate(
                    ret.res,
                    this.service.resSchemaId,
                )
                if (!resValidate.isSucc) {
                    return resValidate
                }
            }
            return this.conn.sendData(ret)
        }

        return super._sendReturn(ret)
    }
}
