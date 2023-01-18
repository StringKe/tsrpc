import chalk from 'chalk'

import { MsgService } from '@ntsrpc/tsrpc-base-client'
import { BaseServiceType } from '@ntsrpc/tsrpc-proto'

import { PrefixLogger } from '../models/PrefixLogger'
import { BaseCall, BaseCallOptions } from './BaseCall'





export interface MsgCallOptions<Msg, ServiceType extends BaseServiceType>
    extends BaseCallOptions<ServiceType> {
    service: MsgService
    msg: Msg
}

/**
 * A call request by `client.sendMsg()`
 * @typeParam Msg - Type of the message
 * @typeParam ServiceType - The same `ServiceType` to server, it is used for code auto hint.
 */
export abstract class MsgCall<
    Msg = any,
    ServiceType extends BaseServiceType = any,
> extends BaseCall<ServiceType> {
    readonly type = 'msg' as const

    override readonly service!: MsgService
    readonly msg: Msg

    constructor(
        options: MsgCallOptions<Msg, ServiceType>,
        logger?: PrefixLogger,
    ) {
        super(
            options,
            logger ??
                new PrefixLogger({
                    logger: options.conn.logger,
                    prefixs: [
                        chalk.cyan.underline(`[Msg:${options.service.name}]`),
                    ],
                }),
        )

        this.msg = options.msg
    }
}
