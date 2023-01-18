import type { InitGeneratorOptions } from '../schema'

export function normalizeOptions(
    options: InitGeneratorOptions,
): InitGeneratorOptions {
    return {
        ...options,
    }
}
