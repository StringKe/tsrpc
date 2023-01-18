import http from 'http'
import https from 'https'

import { IHttpProxy } from '@ntsrpc/tsrpc-base-client'
import { TsrpcError } from '@ntsrpc/tsrpc-proto'





/** @internal */
export class HttpProxy implements IHttpProxy {
    /** NodeJS HTTP Agent */
    agent?: http.Agent | https.Agent

    fetch(
        options: Parameters<IHttpProxy['fetch']>[0],
    ): ReturnType<IHttpProxy['fetch']> {
        const nodeHttp = options.url.startsWith('https://') ? https : http

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

        const httpReq: http.ClientRequest = nodeHttp.request(
            options.url,
            {
                method: options.method,
                agent: this.agent,
                timeout: options.timeout,
                headers: options.headers,
            },
            (httpRes) => {
                const data: Buffer[] = []
                httpRes.on('data', (v: Buffer) => {
                    data.push(v)
                })
                httpRes.on('end', () => {
                    const buf: Uint8Array = Buffer.concat(data)
                    if (options.responseType === 'text') {
                        rs({
                            isSucc: true,
                            res: buf.toString(),
                        })
                    } else {
                        rs({
                            isSucc: true,
                            res: buf,
                        })
                    }
                })
            },
        )

        httpReq.on('error', (e) => {
            rs({
                isSucc: false,
                err: new TsrpcError(e.message, {
                    type: TsrpcError.Type.NetworkError,
                    code: (e as any).code,
                }),
            })
        })

        const buf = options.data
        httpReq.end(
            typeof buf === 'string'
                ? buf
                : Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength),
        )

        const abort = httpReq.abort.bind(httpReq)

        return {
            promise: promise,
            abort: abort,
        }
    }
}
