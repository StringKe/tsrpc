import * as path from 'path'

import * as fs from './file-utils'

export async function setPackageName(dir: string, scope: string) {
    const packageContent: string = await fs.readFileAsync(
        path.join(dir, 'package.json'),
        { encoding: 'utf8' },
    )

    const packageObj = JSON.parse(packageContent)

    const hasScope = (packageObj.name as string).indexOf('@') > -1
    if (hasScope) {
        packageObj.name = packageObj.name.replace(/@[^/]+\//, `@${scope}/`)
    }

    await fs.writeFileAsync(
        path.join(dir, 'package.json'),
        JSON.stringify(packageObj, null, 4),
        { encoding: 'utf8' },
    )
}
