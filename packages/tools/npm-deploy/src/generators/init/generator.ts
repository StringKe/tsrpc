import {
    convertNxGenerator,
    type GeneratorCallback,
    type Tree,
} from '@nrwl/devkit'
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial'

import type { InitGeneratorOptions } from './schema'
import { addDependencies, normalizeOptions } from './utils'

export async function initGenerator(
    tree: Tree,
    rawOptions: InitGeneratorOptions,
): Promise<GeneratorCallback> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const options = normalizeOptions(rawOptions)
    const installPackagesTask = addDependencies(tree)

    return runTasksInSerial(installPackagesTask)
}

export default initGenerator

export const initSchematic = convertNxGenerator(initGenerator)
