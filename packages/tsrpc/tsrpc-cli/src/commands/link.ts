import { exec } from 'child_process'
import path from 'path'

import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'

import { Logger } from '@ntsrpc/tsrpc-proto'

import { resPath } from '../bin'
import { i18n } from '../i18n/i18n'
import { CliUtil } from '../models/CliUtil'
import { TsrpcConfig } from '../models/TsrpcConfig'
import { error, formatStr } from '../models/util'

export type CmdLinkOptions =
    | {
          elevate: string | undefined
          from: string | undefined
          to: string | undefined
          verbose: boolean | undefined
          config: undefined
      }
    | {
          config: TsrpcConfig
          elevate: undefined
      }

export async function cmdLink(options: CmdLinkOptions) {
    if (options.config) {
        if (!options.config.sync?.length) {
            console.log(chalk.yellow(i18n.nothingSyncConf))
            return
        }

        const linkConfs = options.config.sync.filter(
            (v) => v.type === 'symlink',
        )
        await ensureSymlinks(
            linkConfs.map((v) => ({
                src: v.from,
                dst: v.to,
            })),
            console,
        )
        console.log(chalk.green(i18n.allLinkedSucc))
    } else if (options.elevate) {
        const confs = JSON.parse(decodeURIComponent(options.elevate))
        await ensureSymlinks(confs, console, true)
    } else {
        // Validate options
        if (!options.from) {
            throw error(i18n.missingParam, { param: 'from' })
        }
        if (!options.to) {
            throw error(i18n.missingParam, { param: 'to' })
        }

        await ensureSymlinks(
            [
                {
                    src: options.from,
                    dst: options.to,
                },
            ],
            console,
        )
        console.log(chalk.green(i18n.linkedSucc))
    }
}

export async function ensureSymlinks(
    confs: { src: string; dst: string }[],
    logger?: Logger,
    isElevate?: boolean,
): Promise<{ isAllSucc: boolean }> {
    // ?????? elevate ??????????????????undefined ?????????????????? elevate ??????
    let elevateResult: boolean | undefined
    let createJunction: boolean | undefined

    let isAllSucc = true

    for (const conf of confs) {
        let { src, dst } = conf
        src = path.resolve(src)
        dst = path.resolve(dst)

        if (elevateResult) {
            logger?.log(
                chalk.green(
                    `??? ${
                        createJunction ? i18n.junction : i18n.link
                    } ${src} -> ${dst}`,
                ),
            )
            continue
        }

        // ?????? dst ??????????????????
        const dstParent = path.dirname(dst)
        if (
            !(await fs
                .access(dstParent)
                .then(() => true)
                .catch(() => false))
        ) {
            logger?.log(
                chalk.yellow(
                    `??? ${i18n.link} ${src} -> ${dst}\n  |- ${formatStr(
                        i18n.dirNotExists,
                        { dir: dstParent },
                    )}`,
                ),
            )
            isAllSucc = false
            continue
        }

        await fs.ensureDir(src)

        // ?????????????????????????????????????????????
        if (await isSymbolicLink(dst, src)) {
            logger?.log(
                chalk.green(
                    `??? ${
                        createJunction ? i18n.junction : i18n.link
                    } ${src} -> ${dst}`,
                ),
            )
            continue
        }

        // ????????????????????????????????????????????????
        await fs.rm(dst, { recursive: true, force: true })
        // ?????????????????????
        const relativeSrc = path.relative(dstParent, src)

        // Try first time
        let err = await fs
            .symlink(relativeSrc, dst, createJunction ? 'junction' : 'dir')
            .catch((e) => e)

        // Windows ???????????????????????????
        if (
            !isElevate &&
            process.platform === 'win32' &&
            err?.code === 'EPERM'
        ) {
            // ????????????????????????????????????
            while (elevateResult === undefined) {
                // ????????????
                const elevateCmd = `"${path.resolve(
                    resPath,
                    'elevate.cmd',
                )}" "${process.execPath}" ${process.execArgv.join(' ')} "${
                    process.argv[1]
                }" link --elevate="${encodeURIComponent(
                    JSON.stringify(confs),
                )}"`
                await new Promise((rs) => {
                    exec(elevateCmd).on('close', rs)
                })

                // ?????? elevate ??????????????????????????????????????????
                // ?????????????????????????????????????????? 5 ???
                CliUtil.doing(i18n.elevatingForLink)
                const startTime = Date.now()
                while (Date.now() - startTime <= 5000) {
                    // ?????????????????????????????????
                    elevateResult = await isSymbolicLink(dst, src)
                    if (elevateResult) {
                        err = undefined
                        break
                    }

                    await new Promise((rs) => setTimeout(rs, 500))
                }
                CliUtil.done(!!elevateResult)

                // ????????????????????????????????? junction
                if (!elevateResult) {
                    const answer: 'retry' | 'junction' = (
                        await inquirer.prompt({
                            type: 'list',
                            message: chalk.yellow(i18n.linkFailed),
                            choices: [
                                { name: i18n.linkRetry, value: 'retry' },
                                { name: i18n.linkJunction, value: 'junction' },
                            ],
                            name: 'res',
                        })
                    ).res

                    // ?????????????????????
                    if (answer === 'retry') {
                        elevateResult = undefined
                    }
                    // ???????????? Junction??
                    else {
                        createJunction = true
                    }
                }
            }
            // ????????????????????? junction
            if (elevateResult === false && createJunction) {
                err = await fs
                    .symlink(relativeSrc, dst, 'junction')
                    .catch((e) => e)
            }
        }

        // Fail
        if (err) {
            throw err
        }

        // Success
        logger?.log(
            chalk.green(
                `??? ${
                    createJunction ? i18n.junction : i18n.link
                } ${src} -> ${dst}`,
            ),
        )
    }

    return { isAllSucc: isAllSucc }
}

export async function isSymbolicLink(dst: string, src: string) {
    // dst ????????? Symlink
    if (
        await fs
            .lstat(dst)
            .then((v) => v.isSymbolicLink())
            .catch((e) => false)
    ) {
        // ?????? symlink ??? destination ????????????
        const oldSymlinkPath = path.resolve(
            path.dirname(dst),
            await fs.readlink(dst),
        )

        // ?????????
        if (oldSymlinkPath === src) {
            return true
        }
    }

    return false
}
