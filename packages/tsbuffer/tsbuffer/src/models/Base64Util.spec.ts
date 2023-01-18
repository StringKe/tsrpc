import { Base64Util } from './Base64Util'





const oriBuffer = global.Buffer

describe('Base64Util', () => {
    it('should work', () => {
        const buf = new Uint8Array([
            1, 2, 3, 4, 5, 255, 254, 253, 252, 251, 250,
        ])
        const base64 = Base64Util.bufferToBase64(buf)
        const decode = Base64Util.base64ToBuffer(base64)
        expect(decode).toEqual(buf)
    })

    it('should work with Buffer', () => {
        const buf = new Uint8Array([
            1, 2, 3, 4, 5, 255, 254, 253, 252, 251, 250,
        ])

        const b1 = Base64Util.bufferToBase64(buf)
        ;(global as any).Buffer = undefined
        const b2 = Base64Util.bufferToBase64(buf)
        ;(global as any).Buffer = oriBuffer

        expect(b1).toEqual(b2)

        const d1 = Base64Util.base64ToBuffer(b1)
        ;(global as any).Buffer = undefined
        const d2 = Base64Util.base64ToBuffer(b2)
        ;(global as any).Buffer = oriBuffer

        expect(d1).toEqual(d2)
        expect(d1).toEqual(buf)
    })
})
