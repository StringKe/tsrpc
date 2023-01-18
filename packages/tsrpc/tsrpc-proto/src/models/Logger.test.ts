import { expect } from '@jest/globals'

import { Logger, setLogLevel } from './Logger'





describe('Logger', function () {
    it('setLogLevel', function () {
        let num = 0
        const logger: Logger = {
            debug: () => {
                ++num
            },
            log: () => {
                ++num
            },
            warn: () => {
                ++num
            },
            error: () => {
                ++num
            },
        }
        setLogLevel(logger, 'warn')

        logger.debug('aaa')
        logger.log()
        expect(num).toBe(0)

        logger.warn()
        expect(num).toBe(1)

        logger.error()
        expect(num).toBe(2)
    })
})
