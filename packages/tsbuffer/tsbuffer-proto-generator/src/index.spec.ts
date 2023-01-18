import * as fs from 'fs'

import { TSBufferProtoGenerator } from './index'

jest.mock('fs')
const mockFS: jest.Mocked<typeof fs> = <jest.Mocked<typeof fs>>fs

describe('TsBufferProtoGenerator', () => {
    it('should work', async () => {
        const generator = new TSBufferProtoGenerator({})
        mockFS.readFileSync.mockReturnValue(
            Buffer.from(`export interface BasicType {
    
}
`),
        )

        const result = await generator.generate('proto.ts', {})
        expect(result).toEqual({
            'proto/BasicType': {
                'type': 'Interface',
            },
        })
    })

    it('should work', async () => {
        const generator = new TSBufferProtoGenerator({})
        mockFS.readFileSync.mockReturnValue(
            Buffer.from(`export interface BasicType {
    type: string
}
`),
        )

        const result = await generator.generate('proto.ts', {})
        expect(result).toEqual({
            'proto/BasicType': {
                'properties': [
                    {
                        'id': 0,
                        'name': 'type',
                        'type': {
                            'type': 'String',
                        },
                    },
                ],
                'type': 'Interface',
            },
        })
    })
})
