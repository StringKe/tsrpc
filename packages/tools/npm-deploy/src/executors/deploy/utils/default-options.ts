import { npmAccess } from '../../../core'
import { NpmPublishOptions } from './interfaces'





export const defaults: NpmPublishOptions = {
    tag: undefined,
    access: npmAccess.public,
    otp: undefined,
    dryRun: false,
}
