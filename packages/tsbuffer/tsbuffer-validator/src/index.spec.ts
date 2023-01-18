import { expect } from '@jest/globals'

import {
    LiteralTypeSchema,
    SchemaType,
    TSBufferSchema,
} from '@ntsrpc/tsbuffer-schema'

import { ErrorType } from './ErrorMsg'
import { TSBufferValidator } from './TSBufferValidator'
import { ValidateResultUtil } from './ValidateResultUtil'

function testBaseError(
    validator: TSBufferValidator,
    params: string,
    value: unknown,
    type: string,
) {
    expect(validator.validate(value, 'a/b').errMsg).toEqual(
        ValidateResultUtil.error(ErrorType.TypeError, params, type).errMsg,
    )
}

describe('TsBuffer-Validator', () => {
    it('Base: non-exists path or symbol-name', function () {
        const validator = new TSBufferValidator(
            {
                'a/b': {
                    type: 'xxx' as any,
                },
                'a/c': {
                    type: SchemaType.Reference,
                    target: 'x/x',
                },
                'a/d': {
                    type: SchemaType.Reference,
                    target: 'a/x',
                },
            },
            {},
        )

        expect(() => {
            validator.validate(1, 'xxx/xxx' as never)
        }).toThrow(/Cannot find schema/)
        expect(() => {
            validator.validate(1, 'a/xxx' as never)
        }).toThrow(/Cannot find schema/)
        expect(() => {
            validator.validate(1, 'a/b')
        }).toThrow(/Unsupported schema type/)
        expect(() => {
            validator.validate(1, 'a/c')
        }).toThrow(/Cannot find reference target: x\/x/)
        expect(() => {
            validator.validate(1, 'a/d')
        }).toThrow(/Cannot find reference target: a\/x/)
    })

    it('Base: Boolean', function () {
        const schema: TSBufferSchema = {
            type: SchemaType.Boolean,
        }
        const validator = new TSBufferValidator({
            'a/b': schema,
        })

        expect(validator.validate(true, 'a/b').isSucc).toBe(true)
        expect(validator.validate(false, 'a/b').isSucc).toBe(true)

        const testError = (value: unknown, type: string) => {
            testBaseError(validator, 'boolean', value, type)
        }

        testError(null, 'null')
        testError(undefined, 'undefined')
        testError(123, 'number')
        testError({}, 'Object')
        testError('123', 'string')
    })

    it('Base: Number', function () {
        const schema: TSBufferSchema = {
            type: SchemaType.Number,
        }
        const validator = new TSBufferValidator({
            'a/b': schema,
        })

        expect(validator.validate(123, 'a/b').isSucc).toBe(true)
        expect(validator.validate(-123.456, 'a/b').isSucc).toBe(true)

        const testError = (value: unknown, type: string) => {
            testBaseError(validator, 'number', value, type)
        }

        testError(null, 'null')
        testError(undefined, 'undefined')
        testError(true, 'boolean')
        testError({}, 'Object')
        testError('123', 'string')
    })

    // int
    it('Base: int', function () {
        const scalarTypes = ['int', 'uint'] as const
        for (const scalarType of scalarTypes) {
            const schema: TSBufferSchema = {
                type: SchemaType.Number,
                scalarType: scalarType,
            }
            const validator = new TSBufferValidator({
                'a/b': schema,
            })

            expect(validator.validate(123, 'a/b').isSucc).toBe(true)
            expect(validator.validate(0.0, 'a/b').isSucc).toBe(true)

            if (scalarType.startsWith('u') || scalarType.startsWith('fixed')) {
                expect(validator.validate(-123, 'a/b').errMsg).toBe(
                    ValidateResultUtil.error(
                        ErrorType.InvalidScalarType,
                        -123,
                        scalarType,
                    ).errMsg,
                )
            } else {
                expect(validator.validate(-123, 'a/b').isSucc).toBe(true)
            }

            expect(validator.validate(BigInt(1234), 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.TypeError,
                    'number',
                    'bigint',
                ).errMsg,
            )

            expect(validator.validate(123.456, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.InvalidScalarType,
                    123.456,
                    scalarType,
                ).errMsg,
            )

            expect(validator.validate(-123.456, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.InvalidScalarType,
                    -123.456,
                    scalarType,
                ).errMsg,
            )
        }
    })

    it('Base: bigint', function () {
        const value = ['bigint', 'bigint64', 'biguint64'] as const
        value.forEach((v) => {
            const schema: TSBufferSchema = {
                type: SchemaType.Number,
                scalarType: v,
            }
            const validator = new TSBufferValidator({
                'a/b': schema,
            })

            expect(validator.validate(BigInt(1234), 'a/b')).toBe(
                ValidateResultUtil.succ,
            )

            expect(validator.validate(1234, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.TypeError,
                    'bigint',
                    'number',
                ).errMsg,
            )

            expect(validator.validate(1.234, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.TypeError,
                    'bigint',
                    'number',
                ).errMsg,
            )

            expect(validator.validate(true, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.TypeError,
                    'bigint',
                    'boolean',
                ).errMsg,
            )

            expect(validator.validate('', 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.TypeError,
                    'bigint',
                    'string',
                ).errMsg,
            )

            expect(validator.validate('123', 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.TypeError,
                    'bigint',
                    'string',
                ).errMsg,
            )
        })
    })

    it('Base: String', function () {
        const schema: TSBufferSchema = {
            type: SchemaType.String,
        }
        const validator = new TSBufferValidator({
            'a/b': schema,
        })

        expect(validator.validate('123', 'a/b').isSucc).toBe(true)
        expect(validator.validate('', 'a/b').isSucc).toBe(true)

        const testError = (value: unknown, type: string) => {
            testBaseError(validator, 'string', value, type)
        }

        testError(null, 'null')
        testError(undefined, 'undefined')
        testError(true, 'boolean')
        testError({}, 'Object')
        testError(123, 'number')
    })

    it('Base: Enum', function () {
        const schema: TSBufferSchema = {
            type: SchemaType.Enum,
            members: [
                { id: 0, value: 0 },
                { id: 1, value: 1 },
                { id: 2, value: 'ABC' },
            ],
        }
        const validator = new TSBufferValidator({
            'a/b': schema,
        })

        expect(validator.validate(0, 'a/b').isSucc).toBe(true)
        expect(validator.validate(1, 'a/b').isSucc).toBe(true)
        expect(validator.validate('ABC', 'a/b').isSucc).toBe(true)

        const values = ['0', '1', 123] as const

        values.forEach((v) => {
            expect(validator.validate(v, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(ErrorType.InvalidEnumValue, v).errMsg,
            )
        })

        const typeValues = [
            [{}, 'Object'],
            [true, 'boolean'],
            [null, 'null'],
            [undefined, 'undefined'],
        ] as const
        typeValues.forEach(([v, type]) => {
            expect(validator.validate(v, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.TypeError,
                    'string | number',
                    type,
                ).errMsg,
            )
        })
    })

    it('Base: Any', function () {
        const validator = new TSBufferValidator({
            'a/b': {
                type: SchemaType.Any,
            },
        })

        expect(validator.validate(true, 'a/b').isSucc).toBe(true)
        expect(validator.validate(null, 'a/b').isSucc).toBe(true)
        expect(validator.validate(undefined, 'a/b').isSucc).toBe(true)
        expect(validator.validate(123, 'a/b').isSucc).toBe(true)
        expect(validator.validate('123', 'a/b').isSucc).toBe(true)
        expect(validator.validate({}, 'a/b').isSucc).toBe(true)
    })

    it('Base: Literal', function () {
        const schema: LiteralTypeSchema = {
            type: SchemaType.Literal,
            literal: '123',
        }
        const validator = new TSBufferValidator({
            'a/b': schema,
        })

        expect(validator.validate('123', 'a/b').isSucc).toBe(true)

        const values = [123, null, undefined] as const

        values.forEach((v) => {
            expect(validator.validate(v, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.InvalidLiteralValue,
                    schema.literal,
                    v,
                ).errMsg,
            )
        })

        const otherValues = [123, true, null, undefined, null]

        otherValues.forEach((v) => {
            const errorValue = `v${String(v)}`
            const loopSchema: LiteralTypeSchema = {
                type: SchemaType.Literal,
                literal: v,
            }
            const loopValidator = new TSBufferValidator(
                {
                    'a/b': loopSchema,
                },
                {
                    strictNullChecks: true,
                },
            )
            expect(loopValidator.validate(v, 'a/b').isSucc).toBe(true)
            expect(validator.validate(errorValue, 'a/b').errMsg).toBe(
                ValidateResultUtil.error(
                    ErrorType.InvalidLiteralValue,
                    schema.literal,
                    errorValue,
                ).errMsg,
            )
        })
    })
})
