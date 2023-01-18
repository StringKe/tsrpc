import { npmAccess } from '../../../core'
import type { InstallGeneratorOptions } from '../schema'

export function normalizeOptions(
    rawOptions: InstallGeneratorOptions,
): InstallGeneratorOptions {
    return {
        ...rawOptions,
        access: rawOptions.access || npmAccess.public,
    }
}
