import { Utf8Coder } from './Utf8Coder'

describe('Utf8Coder', () => {
    it('should work', () => {
        const str = 'test'.repeat(1000)
        expect(Utf8Coder.measureLength(str)).toEqual(
            Buffer.byteLength(str, 'utf-8'),
        )
    })

    it('should encode and decode work', () => {
        const str = 'test'.repeat(1)

        const jsLength = Utf8Coder.measureLength(str)
        const jsBuf = new Uint8Array(jsLength + 10)
        const nodeBuf = new Uint8Array(jsLength + 10)

        const buf1 = Buffer.from(
            nodeBuf.buffer,
            nodeBuf.byteOffset,
            nodeBuf.byteLength,
        )
        const buf2 = Buffer.from(
            jsBuf.buffer,
            jsBuf.byteOffset,
            jsBuf.byteLength,
        )

        expect(Utf8Coder.write(str, jsBuf, 5)).toEqual(buf1.write(str, 'utf-8'))
        expect(jsBuf).toEqual(nodeBuf)

        expect(Utf8Coder.read(jsBuf, 5, jsLength)).toEqual(str)
        expect(Utf8Coder.read(nodeBuf, 5, jsLength)).toEqual(str)
        expect(buf1.toString('utf-8', 5, 5 + jsLength)).toEqual(str)
        expect(buf2.toString('utf-8', 5, 5 + jsLength)).toEqual(str)
    })
})
