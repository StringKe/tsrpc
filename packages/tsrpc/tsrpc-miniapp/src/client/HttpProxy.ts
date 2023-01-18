import { IHttpProxy } from '@ntsrpc/tsrpc-base-client'
import { TsrpcError } from '@ntsrpc/tsrpc-proto'

import { MiniappObj } from '../models/MiniappObj'





export class HttpProxy implements IHttpProxy {
    miniappObj?: MiniappObj

    fetch(
        options: Parameters<IHttpProxy['fetch']>[0],
    ): ReturnType<IHttpProxy['fetch']> {
        if (!this.miniappObj) {
            return {
                abort: () => {
                    // Do nothing
                },
                promise: Promise.resolve({
                    isSucc: false,
                    err: new TsrpcError(
                        'miniappObj is not set, please check if this is miniapp environment.',
                        { type: TsrpcError.Type.ClientError },
                    ),
                }),
            }
        }

        let rs!: (
            v:
                | { isSucc: true; res: string | Uint8Array }
                | { isSucc: false; err: TsrpcError },
        ) => void
        const promise: ReturnType<IHttpProxy['fetch']>['promise'] = new Promise(
            (_rs) => {
                rs = _rs
            },
        )

        let data: string | ArrayBuffer
        if (typeof options.data === 'string') {
            data = options.data
        } else {
            const buf = options.data
            if (
                buf.byteOffset === 0 &&
                buf.byteLength === buf.buffer.byteLength
            ) {
                data = buf.buffer
            } else {
                data = buf.buffer.slice(
                    buf.byteOffset,
                    buf.byteOffset + buf.byteLength,
                )
            }
        }

        const reqTask = this.miniappObj.request({
            url: options.url,
            data: data,
            method: options.method as any,
            header: options.headers ?? {
                'content-type': 'application/octet-stream',
            },
            dataType: '其他',
            responseType: options.responseType,
            success: (res) => {
                if (res.statusCode === 200 || res.statusCode === 500) {
                    rs({
                        isSucc: true,
                        res:
                            typeof res.data === 'string'
                                ? res.data
                                : new Uint8Array(res.data as ArrayBuffer),
                    })
                } else {
                    rs({
                        isSucc: false,
                        err: new TsrpcError({
                            message: 'HTTP Error ' + res.statusCode,
                            type: TsrpcError.Type.ServerError,
                            httpCode: res.statusCode,
                        }),
                    })
                }
            },
            fail: (res) => {
                rs({
                    isSucc: false,
                    err: new TsrpcError({
                        message: 'Network Error',
                        type: TsrpcError.Type.NetworkError,
                        innerErr: res,
                    }),
                })
            },
        })

        const abort = reqTask.abort.bind(reqTask)

        return {
            promise: promise,
            abort: abort,
        }
    }
}
