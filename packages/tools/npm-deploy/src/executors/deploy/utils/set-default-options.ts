import { DeployExecutorOptions } from '../schema'
import { defaults } from './default-options'

export function prepareOptions(
    origOptions: DeployExecutorOptions,
): DeployExecutorOptions {
    const options = {
        ...defaults,
        ...origOptions,
    }

    return options
}
