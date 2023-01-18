import http from 'http';
import https from 'https';



import { BaseHttpClient, BaseHttpClientOptions, defaultBaseHttpClientOptions } from '@ntsrpc/tsrpc-base-client';
import { BaseServiceType, ServiceProto } from '@ntsrpc/tsrpc-proto';



import { getClassObjectId } from '../../models/getClassObjectId';
import { HttpProxy } from './HttpProxy';





/**
 * Client for TSRPC HTTP Server.
 * It uses native http module of NodeJS.
 * @typeParam ServiceType - `ServiceType` from generated `proto.ts`
 */
export class HttpClient<
    ServiceType extends BaseServiceType,
> extends BaseHttpClient<ServiceType> {
    override readonly options!: Readonly<HttpClientOptions>

    constructor(
        proto: ServiceProto<ServiceType>,
        options?: Partial<HttpClientOptions>,
    ) {
        const httpProxy = new HttpProxy()
        super(proto, httpProxy, {
            customObjectIdClass: getClassObjectId(),
            ...defaultHttpClientOptions,
            ...options,
        })

        httpProxy.agent = this.options.agent
    }
}

const defaultHttpClientOptions: HttpClientOptions = {
    ...defaultBaseHttpClientOptions,
}

export interface HttpClientOptions extends BaseHttpClientOptions {
    /** NodeJS HTTP Agent */
    agent?: http.Agent | https.Agent
}
