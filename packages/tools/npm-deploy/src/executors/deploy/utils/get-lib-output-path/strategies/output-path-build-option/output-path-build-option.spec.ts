import * as path from 'path'

import { mockProjectRoot } from '../../../../../../__mocks__/generators'
import { UnapplicableStrategyError } from '../shared'
import { outputPathOptionStrategy } from './output-path-build-option'

describe('outputPathOptionStrategy', () => {
    const projectRoot = mockProjectRoot

    it('should return the right dist path', () => {
        const outputPath = 'my/custom-folder'
        const expectedPath = path.join(projectRoot, outputPath)

        const gottenPath = outputPathOptionStrategy.executor(
            projectRoot,
            { outputPath },
            {},
        )

        expect(gottenPath).toBe(expectedPath)
    })

    it('should throw an error if trying the execute the strategy when it is not applicable', () => {
        expect(() =>
            outputPathOptionStrategy.executor(projectRoot, {}, {}),
        ).toThrowError(UnapplicableStrategyError)
    })

    describe('isStrategyApplicable', () => {
        it('should indicate positively if the strategy is applicable', () => {
            const outputPath = 'my/custom-folder'

            const isApplicable = outputPathOptionStrategy.isStrategyApplicable(
                {
                    outputPath,
                },
                {},
            )

            expect(isApplicable).toBe(true)
        })

        it('should indicate negatively if the strategy is not applicable', () => {
            const isApplicable = outputPathOptionStrategy.isStrategyApplicable(
                { project: 'path/to/ng-package.json' },
                {},
            )

            expect(isApplicable).toBe(false)
        })
    })
})
