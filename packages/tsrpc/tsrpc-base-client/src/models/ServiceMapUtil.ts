import { ApiServiceDef, MsgServiceDef, ServiceProto } from '@ntsrpc/tsrpc-proto'

/** A utility for generate `ServiceMap` */
export class ServiceMapUtil {
    static getServiceMap(proto: ServiceProto): ServiceMap {
        const map: ServiceMap = {
            id2Service: {},
            apiName2Service: {},
            msgName2Service: {},
        }

        for (const v of proto.services) {
            const match = v.name.match(/(.+\/)?([^/]+)$/)
            if (match) {
                const path = match[1] || ''
                const name = match[2]
                if (v.type === 'api') {
                    const svc: ApiService = {
                        ...v,
                        reqSchemaId: `${path}Ptl${name}/Req${name}`,
                        resSchemaId: `${path}Ptl${name}/Res${name}`,
                    }
                    map.apiName2Service[v.name] = svc
                    map.id2Service[v.id] = svc
                } else {
                    const svc: MsgService = {
                        ...v,
                        msgSchemaId: `${path}Msg${name}/Msg${name}`,
                    }
                    map.msgName2Service[v.name] = svc
                    map.id2Service[v.id] = svc
                }
            }
        }

        return map
    }
}

export interface ServiceMap {
    id2Service: { [serviceId: number]: ApiService | MsgService }
    apiName2Service: { [apiName: string]: ApiService | undefined }
    msgName2Service: { [msgName: string]: MsgService | undefined }
}

export interface ApiService extends ApiServiceDef {
    reqSchemaId: string
    resSchemaId: string
}

export interface MsgService extends MsgServiceDef {
    msgSchemaId: string
}
