import { logger } from '@nrwl/devkit'

import { DeployExecutorOptions } from '../schema'
import {
    NpmPublishOptions,
    prepareOptions,
    setPackageVersion,
    spawnAsync,
} from '../utils'
import { setPackageName } from '../utils/set-package-name'





export async function run(dir: string, options: DeployExecutorOptions) {
    try {
        options = prepareOptions(options)

        if (options.dryRun) {
            logger.info('Dry-run: The package is not going to be published')
        }

        /*
    Modifying the dist when the user is dry-run mode,
    thanks to the Nx Cache could lead to leading to publishing and unexpected package version
    when the option is removed
    */
        if (options.packageVersion && !options.dryRun) {
            await setPackageVersion(dir, options.packageVersion)
        }
        if (options.replaceScope) {
            await setPackageName(dir, options.replaceScope)
        }

        const npmOptions = extractOnlyNPMOptions(options)

        await spawnAsync('npm', [
            'publish',
            dir,
            ...getOptionsStringArr(npmOptions),
        ])

        if (options.dryRun) {
            logger.info('The options are:')
            logger.info(JSON.stringify(options, null, 1))
        }

        logger.info(
            '🚀 Successfully published via ngx-deploy-npm! Have a nice day!',
        )
    } catch (error) {
        logger.error('❌ An error occurred!')
        throw error
    }
}

/**
 * Extract only the options that the `npm publish` command can process
 *
 * @param param0 All the options sent to ng deploy
 */
function extractOnlyNPMOptions({
    access,
    tag,
    otp,
    dryRun,
    registry,
}: DeployExecutorOptions): NpmPublishOptions {
    return {
        access,
        tag,
        otp,
        dryRun,
        registry,
    }
}

function getOptionsStringArr(options: NpmPublishOptions): string[] {
    return (
        Object.keys(options)
            // Get only options with value
            .filter((optKey) => !!(options as Record<string, unknown>)[optKey])
            // to CMD option
            .map((optKey) => ({
                cmdOptions: `--${toKebabCase(optKey)}`,
                value: (options as Record<string, string | boolean | number>)[
                    optKey
                ],
            }))
            // push the command and the value to the array
            .flatMap((cmdOptionValue) => [
                cmdOptionValue.cmdOptions,
                cmdOptionValue.value.toString(),
            ])
    )

    function toKebabCase(str: string) {
        return str
            .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
            .toLowerCase()
    }
}
