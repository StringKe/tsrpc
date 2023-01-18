import { tsrpcTsrpcCli } from './tsrpc-tsrpc-cli'

describe('tsrpcTsrpcCli', () => {
    it('should work', () => {
        expect(tsrpcTsrpcCli()).toEqual('tsrpc-tsrpc-cli')
    })
})
