export class TsCrypto {
    static base64Encode(str: string): string {
        return base64encode(utf16to8(str))
    }

    static base64Decode(str: string): string {
        return utf8to16(base64decode(str))
    }

    static md5 = function (string: string): string {
        function RotateLeft(lValue: number, iShiftBits: number) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
        }

        function AddUnsigned(lX: number, lY: number) {
            const lX8 = lX & 0x80000000
            const lY8 = lY & 0x80000000
            const lX4 = lX & 0x40000000
            const lY4 = lY & 0x40000000
            const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)
            if (lX4 & lY4) {
                return lResult ^ 0x80000000 ^ lX8 ^ lY8
            }
            if (lX4 | lY4) {
                if (lResult & 0x40000000) {
                    return lResult ^ 0xc0000000 ^ lX8 ^ lY8
                } else {
                    return lResult ^ 0x40000000 ^ lX8 ^ lY8
                }
            } else {
                return lResult ^ lX8 ^ lY8
            }
        }

        function F(x: number, y: number, z: number) {
            return (x & y) | (~x & z)
        }

        function G(x: number, y: number, z: number) {
            return (x & z) | (y & ~z)
        }

        function H(x: number, y: number, z: number) {
            return x ^ y ^ z
        }

        function I(x: number, y: number, z: number) {
            return y ^ (x | ~z)
        }

        function FF(
            a: number,
            b: number,
            c: number,
            d: number,
            x: number,
            s: number,
            ac: number,
        ) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac))
            return AddUnsigned(RotateLeft(a, s), b)
        }

        function GG(
            a: number,
            b: number,
            c: number,
            d: number,
            x: number,
            s: number,
            ac: number,
        ) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac))
            return AddUnsigned(RotateLeft(a, s), b)
        }

        function HH(
            a: number,
            b: number,
            c: number,
            d: number,
            x: number,
            s: number,
            ac: number,
        ) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac))
            return AddUnsigned(RotateLeft(a, s), b)
        }

        function II(
            a: number,
            b: number,
            c: number,
            d: number,
            x: number,
            s: number,
            ac: number,
        ) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac))
            return AddUnsigned(RotateLeft(a, s), b)
        }

        function ConvertToWordArray(str: string): number[] {
            let lWordCount
            const lMessageLength = str.length
            const lNumberOfWords_temp1 = lMessageLength + 8
            const lNumberOfWords_temp2 =
                (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64
            const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16
            const lWordArray: number[] = Array(lNumberOfWords - 1)
            let lBytePosition = 0
            let lByteCount = 0
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4
                lBytePosition = (lByteCount % 4) * 8
                lWordArray[lWordCount] =
                    lWordArray[lWordCount] |
                    (str.charCodeAt(lByteCount) << lBytePosition)
                lByteCount++
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4
            lBytePosition = (lByteCount % 4) * 8
            lWordArray[lWordCount] =
                lWordArray[lWordCount] | (0x80 << lBytePosition)
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
            return lWordArray
        }

        function WordToHex(lValue: number) {
            let WordToHexValue = '',
                WordToHexValue_temp = '',
                lByte,
                lCount
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255
                WordToHexValue_temp = '0' + lByte.toString(16)
                WordToHexValue =
                    WordToHexValue +
                    WordToHexValue_temp.substring(
                        WordToHexValue_temp.length - 2,
                        2,
                    )
            }
            return WordToHexValue
        }

        function Utf8Encode(str: string) {
            str = str.replace(/\r\n/g, '\n')
            let utfText = ''

            for (let n = 0; n < str.length; n++) {
                const c = str.charCodeAt(n)

                if (c < 128) {
                    utfText += String.fromCharCode(c)
                } else if (c > 127 && c < 2048) {
                    utfText += String.fromCharCode((c >> 6) | 192)
                    utfText += String.fromCharCode((c & 63) | 128)
                } else {
                    utfText += String.fromCharCode((c >> 12) | 224)
                    utfText += String.fromCharCode(((c >> 6) & 63) | 128)
                    utfText += String.fromCharCode((c & 63) | 128)
                }
            }

            return utfText
        }

        let k: number
        let AA: number, BB: number, CC: number, DD: number
        let a: number, b: number, c: number, d: number
        const S11 = 7,
            S12 = 12,
            S13 = 17,
            S14 = 22
        const S21 = 5,
            S22 = 9,
            S23 = 14,
            S24 = 20
        const S31 = 4,
            S32 = 11,
            S33 = 16,
            S34 = 23
        const S41 = 6,
            S42 = 10,
            S43 = 15,
            S44 = 21

        string = Utf8Encode(string)

        const x = ConvertToWordArray(string)

        a = 0x67452301
        b = 0xefcdab89
        c = 0x98badcfe
        d = 0x10325476

        for (k = 0; k < x.length; k += 16) {
            AA = a
            BB = b
            CC = c
            DD = d
            a = FF(a, b, c, d, x[k], S11, 0xd76aa478)
            d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756)
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070db)
            b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee)
            a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf)
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a)
            c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613)
            b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501)
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8)
            d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af)
            c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1)
            b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be)
            a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122)
            d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193)
            c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e)
            b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821)
            a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562)
            d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340)
            c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51)
            b = GG(b, c, d, a, x[k], S24, 0xe9b6c7aa)
            a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d)
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453)
            c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681)
            b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8)
            a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6)
            d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6)
            c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87)
            b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed)
            a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905)
            d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8)
            c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9)
            b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a)
            a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942)
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681)
            c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122)
            b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c)
            a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44)
            d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9)
            c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60)
            b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70)
            a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6)
            d = HH(d, a, b, c, x[k], S32, 0xeaa127fa)
            c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085)
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05)
            a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039)
            d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5)
            c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8)
            b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665)
            a = II(a, b, c, d, x[k], S41, 0xf4292244)
            d = II(d, a, b, c, x[k + 7], S42, 0x432aff97)
            c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7)
            b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039)
            a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3)
            d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92)
            c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d)
            b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1)
            a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f)
            d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0)
            c = II(c, d, a, b, x[k + 6], S43, 0xa3014314)
            b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1)
            a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82)
            d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235)
            c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb)
            b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391)
            a = AddUnsigned(a, AA)
            b = AddUnsigned(b, BB)
            c = AddUnsigned(c, CC)
            d = AddUnsigned(d, DD)
        }

        const temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)

        return temp.toLowerCase()
    }
}

function utf16to8(str: string) {
    let out, i, c
    out = ''
    const len = str.length
    for (i = 0; i < len; i++) {
        c = str.charCodeAt(i)
        if (c >= 0x0001 && c <= 0x007f) {
            out += str.charAt(i)
        } else if (c > 0x07ff) {
            out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f))
            out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f))
            out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
        } else {
            out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f))
            out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
        }
    }
    return out
}

function utf8to16(str: string) {
    let out, i, c
    let char2, char3
    out = ''
    const len = str.length
    i = 0
    while (i < len) {
        c = str.charCodeAt(i++)
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                // 0xxxxxxx
                out += str.charAt(i - 1)
                break
            case 12:
            case 13:
                // 110x xxxx 10xx xxxx
                char2 = str.charCodeAt(i++)
                out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f))
                break
            case 14:
                // 1110 xxxx 10xx xxxx 10xx xxxx
                char2 = str.charCodeAt(i++)
                char3 = str.charCodeAt(i++)
                out += String.fromCharCode(
                    ((c & 0x0f) << 12) |
                        ((char2 & 0x3f) << 6) |
                        ((char3 & 0x3f) << 0),
                )
                break
        }
    }
    return out
}

function base64encode(str: string) {
    const base64EncodeChars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let out, i
    let c1, c2, c3
    const len = str.length
    i = 0
    out = ''
    while (i < len) {
        c1 = str.charCodeAt(i++) & 0xff
        if (i == len) {
            out += base64EncodeChars.charAt(c1 >> 2)
            out += base64EncodeChars.charAt((c1 & 0x3) << 4)
            out += '=='
            break
        }
        c2 = str.charCodeAt(i++)
        if (i == len) {
            out += base64EncodeChars.charAt(c1 >> 2)
            out += base64EncodeChars.charAt(
                ((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4),
            )
            out += base64EncodeChars.charAt((c2 & 0xf) << 2)
            out += '='
            break
        }
        c3 = str.charCodeAt(i++)
        out += base64EncodeChars.charAt(c1 >> 2)
        out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4))
        out += base64EncodeChars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6))
        out += base64EncodeChars.charAt(c3 & 0x3f)
    }
    return out
}

function base64decode(str: string) {
    const base64DecodeChars = [
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57,
        58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8,
        9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1,
        -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
        39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1,
    ]
    let c1, c2, c3, c4
    let i, out
    const len = str.length
    i = 0
    out = ''
    while (i < len) {
        /* c1 */
        do {
            c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
        } while (i < len && c1 == -1)
        if (c1 == -1) break
        /* c2 */
        do {
            c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
        } while (i < len && c2 == -1)
        if (c2 == -1) break
        out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4))
        /* c3 */
        do {
            c3 = str.charCodeAt(i++) & 0xff
            if (c3 == 61) return out
            c3 = base64DecodeChars[c3]
        } while (i < len && c3 == -1)
        if (c3 == -1) break
        out += String.fromCharCode(((c2 & 0xf) << 4) | ((c3 & 0x3c) >> 2))
        /* c4 */
        do {
            c4 = str.charCodeAt(i++) & 0xff
            if (c4 == 61) return out
            c4 = base64DecodeChars[c4]
        } while (i < len && c4 == -1)
        if (c4 == -1) break
        out += String.fromCharCode(((c3 & 0x03) << 6) | c4)
    }
    return out
}
