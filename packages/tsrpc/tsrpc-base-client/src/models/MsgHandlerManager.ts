import { remove } from 'lodash'

import { Logger } from '@ntsrpc/tsrpc-proto'

/**
 * A manager for TSRPC receiving messages
 */
export class MsgHandlerManager {
    // eslint-disable-next-line @typescript-eslint/ban-types
    private _handlers: { [msgName: string]: Function[] | undefined } = {}

    /**
     * Execute all handlers parallelly
     * @returns handlers count
     */
    forEachHandler(
        msgName: string,
        logger: Logger | undefined,
        ...args: any[]
    ): (any | Promise<any>)[] {
        const handlers = this._handlers[msgName]
        if (!handlers) {
            return []
        }

        const output: (any | Promise<any>)[] = []
        for (const handler of handlers) {
            try {
                output.push(handler(...args))
            } catch (e) {
                logger?.error('[MsgHandlerError]', e)
            }
        }
        return output
    }

    /**
     * Add message handler, duplicate handlers to the same `msgName` would be ignored.
     * @param msgName
     * @param handler
     * @returns
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHandler(msgName: string, handler: Function) {
        let handlers = this._handlers[msgName]
        // 初始化Handlers
        if (!handlers) {
            handlers = this._handlers[msgName] = []
        }
        // 防止重复监听
        else if (handlers.some((v) => v === handler)) {
            return
        }

        handlers.push(handler)
    }

    /**
     * Remove handler from the specific `msgName`
     * @param msgName
     * @param handler
     * @returns
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    removeHandler(msgName: string, handler: Function) {
        const handlers = this._handlers[msgName]
        if (!handlers) {
            return
        }

        remove(handlers, (v) => v === handler)
    }

    /**
     * Remove all handlers for the specific `msgName`
     * @param msgName
     */
    removeAllHandlers(msgName: string) {
        this._handlers[msgName] = undefined
    }
}
