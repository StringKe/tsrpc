import {
    BaseServiceType,
    Logger,
    ServiceProto,
    TsrpcError,
    TsrpcErrorType,
} from '@ntsrpc/tsrpc-proto'

import { TransportDataUtil } from '../models/TransportDataUtil'
import {
    BaseClient,
    BaseClientOptions,
    defaultBaseClientOptions,
} from './BaseClient'

/**
 * WebSocket Client for TSRPC.
 * It uses native `WebSocket` of browser.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
export class BaseWsClient<
    ServiceType extends BaseServiceType,
> extends BaseClient<ServiceType> {
    readonly type = 'LONG'
    override readonly options!: Readonly<BaseWsClientOptions>
    // #region Heartbeat
    /**
     * Last latency time (ms) of heartbeat test
     */
    lastHeartbeatLatency = 0
    protected _wsp: IWebSocketProxy
    private _pendingHeartbeat?: {
        startTime: number
        timeoutTimer: ReturnType<typeof setTimeout>
    }
    private _nextHeartbeatTimer?: ReturnType<typeof setTimeout>
    private _connecting?: {
        promise: Promise<{ isSucc: true } | { isSucc: false; errMsg: string }>
        rs: (v: { isSucc: true } | { isSucc: false; errMsg: string }) => void
    }
    private _rsDisconnecting?: () => void

    constructor(
        proto: ServiceProto<ServiceType>,
        wsp: IWebSocketProxy,
        options?: Partial<BaseWsClientOptions>,
    ) {
        super(proto, {
            ...defaultBaseWsClientOptions,
            ...options,
        })

        this._wsp = wsp
        wsp.options = {
            onOpen: this._onWsOpen,
            onClose: this._onWsClose,
            onError: this._onWsError,
            onMessage: this._onWsMessage,
            logger: this.logger,
        }

        this.logger?.log('TSRPC WebSocket Client :', this.options.server)
    }

    private _status: WsClientStatus = WsClientStatus.Closed

    public get status(): WsClientStatus {
        return this._status
    }

    public get isConnected(): boolean {
        return this._status === WsClientStatus.Opened
    }

    /**
     * Start connecting, you must connect first before `callApi()` and `sendMsg()`.
     * @throws never
     */
    async connect(): Promise<
        { isSucc: true; errMsg?: undefined } | { isSucc: false; errMsg: string }
    > {
        // ???????????????
        if (this.isConnected) {
            return { isSucc: true }
        }

        // ????????????
        if (this._connecting) {
            return this._connecting.promise
        }

        // Pre Flow
        const pre = await this.flows.preConnectFlow.exec({}, this.logger)
        // Pre return
        if (pre?.return) {
            return pre.return
        }
        // Canceled
        if (!pre) {
            return new Promise((rs) => {
                // nothing
            })
        }

        try {
            this._wsp.connect(this.options.server, [
                this.options.json ? 'text' : 'buffer',
            ])
        } catch (e: any) {
            this.logger?.error(e)
            return { isSucc: false, errMsg: e.message }
        }
        this._status = WsClientStatus.Opening
        this.logger?.log(`Start connecting ${this.options.server}...`)

        this._connecting = {} as any
        const promiseConnect = new Promise<
            { isSucc: true } | { isSucc: false; errMsg: string }
        >((rs) => {
            this._connecting!.rs = rs
        })
        this._connecting!.promise = promiseConnect

        return promiseConnect
    }

    /**
     * Disconnect immediately
     * @throws never
     */
    async disconnect(code?: number, reason?: string) {
        if (this._status === WsClientStatus.Closed) {
            return
        }

        this._status = WsClientStatus.Closing
        this.logger?.log('Start disconnecting...')
        let isClosed = false
        return Promise.race([
            // ???????????? onClose ??????
            new Promise<void>((rs) => {
                this._rsDisconnecting = () => {
                    if (isClosed) {
                        return
                    }
                    isClosed = true

                    rs()
                }

                this._wsClose(code ?? 1000, reason ?? '')
            }), // ???????????????1 ???????????????????????????????????? onClose ???
            new Promise<void>((rs) => {
                setTimeout(() => {
                    if (isClosed) {
                        return
                    }
                    isClosed = true

                    this._onWsClose(
                        1005,
                        'Connection closed, but not received ws.onClose event.',
                    )
                }, 1000)
            }),
        ])
    }

    // #endregion

    protected _onWsOpen = () => {
        if (!this._connecting) {
            return
        }

        this._status = WsClientStatus.Opened
        this._connecting.rs({ isSucc: true })
        this._connecting = undefined
        this.logger?.log('WebSocket connection to server successful')

        this.flows.postConnectFlow.exec({}, this.logger)

        // First heartbeat
        if (this.options.heartbeat) {
            this._heartbeat()
        }
    }

    protected _onWsClose = (code: number, reason: string) => {
        // ??????????????????
        if (this._status === WsClientStatus.Closed) {
            return
        }

        const isManual = !!this._rsDisconnecting
        const isConnectedBefore = this.isConnected || isManual
        this._status = WsClientStatus.Closed

        // ??????????????????????????????
        if (this._connecting) {
            this._connecting.rs({
                isSucc: false,
                errMsg: `Failed to connect to WebSocket server: ${this.options.server}`,
            })
            this._connecting = undefined
            this.logger?.error(
                `Failed to connect to WebSocket server: ${this.options.server}`,
            )
        }

        // Clear heartbeat
        if (this._pendingHeartbeat) {
            clearTimeout(this._pendingHeartbeat.timeoutTimer)
            this._pendingHeartbeat = undefined
        }
        if (this._nextHeartbeatTimer) {
            clearTimeout(this._nextHeartbeatTimer)
        }

        // disconnect??????????????????
        if (this._rsDisconnecting) {
            this._rsDisconnecting()
            this._rsDisconnecting = undefined
            this.logger?.log(
                'Disconnected succ',
                `code=${code} reason=${reason}`,
            )
        }
        // ??? disconnect ??????????????????????????????
        else if (isConnectedBefore) {
            this.logger?.log(
                `Lost connection to ${this.options.server}`,
                `code=${code} reason=${reason}`,
            )
        }

        // postDisconnectFlow????????????????????????????????????
        if (isConnectedBefore) {
            this.flows.postDisconnectFlow.exec(
                {
                    reason: reason,
                    isManual: isManual,
                },
                this.logger,
            )
        }

        // ????????????????????? API ??????
        this._pendingApis.slice().forEach((v) => {
            v.onReturn?.({
                isSucc: false,
                err: new TsrpcError(reason || 'Lost connection to server', {
                    type: TsrpcErrorType.NetworkError,
                    code: 'LOST_CONN',
                }),
            })
        })
    }

    protected _onWsError = (e: unknown) => {
        this.logger?.error('[WebSocket Error]', e)

        // ??????????????????????????????
        if (this._connecting) {
            this._connecting.rs({
                isSucc: false,
                errMsg: `Failed to connect to WebSocket server: ${this.options.server}`,
            })
            this._connecting = undefined
            this.logger?.error(
                `Failed to connect to WebSocket server: ${this.options.server}`,
            )
        }
    }

    protected _onWsMessage = (data: Uint8Array | string) => {
        if (this._status !== WsClientStatus.Opened) {
            return
        }

        // ???????????????
        if (
            data instanceof Uint8Array &&
            data.length === TransportDataUtil.HeartbeatPacket.length &&
            data.every((v, i) => v === TransportDataUtil.HeartbeatPacket[i])
        ) {
            this._onHeartbeatAnswer(data)
            return
        }

        this._onRecvData(data)
    }

    protected async _sendData(
        data: string | Uint8Array,
    ): Promise<{ err?: TsrpcError }> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise<{ err?: TsrpcError | undefined }>(async (rs) => {
            if (!this.isConnected) {
                rs({
                    err: new TsrpcError('WebSocket is not connected', {
                        code: 'WS_NOT_OPEN',
                        type: TsrpcError.Type.ClientError,
                    }),
                })
                return
            }

            // Do Send
            rs(this._wsp.send(data))
        })
    }

    /**
     * Send a heartbeat packet
     */
    private _heartbeat() {
        if (
            this._pendingHeartbeat ||
            this._status !== WsClientStatus.Opened ||
            !this.options.heartbeat
        ) {
            return
        }

        this._pendingHeartbeat = {
            startTime: Date.now(),
            timeoutTimer: setTimeout(() => {
                this._pendingHeartbeat = undefined
                // heartbeat timeout, disconnect if still connected
                this.logger?.error(
                    '[Heartbeat] Heartbeat timeout, the connection disconnected automatically.',
                )
                this._wsClose(3000, 'Heartbeat timeout')
                this._wsp.options.onClose(3000, 'Heartbeat timeout')
            }, this.options.heartbeat.timeout),
        }

        this.options.debugBuf &&
            this.logger?.log(
                '[Heartbeat] Send ping',
                TransportDataUtil.HeartbeatPacket,
            )
        this._sendData(TransportDataUtil.HeartbeatPacket)
    }

    private _onHeartbeatAnswer(data: Uint8Array) {
        if (
            !this._pendingHeartbeat ||
            this._status !== WsClientStatus.Opened ||
            !this.options.heartbeat
        ) {
            return
        }

        // heartbeat succ
        this.lastHeartbeatLatency =
            Date.now() - this._pendingHeartbeat.startTime
        this.options.debugBuf &&
            this.logger?.log(
                `[Heartbeat] Recv pong, latency=${this.lastHeartbeatLatency}ms`,
                data,
            )
        clearTimeout(this._pendingHeartbeat.timeoutTimer)
        this._pendingHeartbeat = undefined

        // next heartbeat timer
        this._nextHeartbeatTimer = setTimeout(() => {
            this._heartbeat()
        }, this.options.heartbeat.interval)
    }

    private _wsClose(code?: number, reason?: string) {
        try {
            this._wsp.close(code ?? 1000, reason ?? '')
        } catch (e) {
            this.logger?.error('[WsCloseError]', e)
        }
    }
}

export const defaultBaseWsClientOptions: BaseWsClientOptions = {
    ...defaultBaseClientOptions,
    server: 'ws://localhost:3000',
}

export interface BaseWsClientOptions extends BaseClientOptions {
    /** Server URL, starts with `ws://` or `wss://`. */
    server: string

    /**
     * Heartbeat test
     * `undefined` represent disable heartbeat test
     * @defaultValue `undefined`
     */
    heartbeat?: {
        /** Interval time between 2 heartbeat packet (unit: ms) */
        interval: number
        /** If a heartbeat packet not got reply during this time, the connection would be closed (unit: ms) */
        timeout: number
    }
}

export interface IWebSocketProxy {
    // Options
    options: {
        onOpen: () => void
        onClose: (code: number, reason: string) => void
        onError: (e: unknown) => void
        onMessage: (data: Uint8Array | string) => void
        logger?: Logger
    }

    // Create and connect (return ws client)
    connect(server: string, protocols?: string[]): void

    close(code?: number, reason?: string): void

    send(data: Uint8Array | string): Promise<{ err?: TsrpcError }>
}

export enum WsClientStatus {
    Opening = 'OPENING',
    Opened = 'OPENED',
    Closing = 'CLOSING',
    Closed = 'CLOSED',
}
