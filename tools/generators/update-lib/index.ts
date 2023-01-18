import {
    getProjects,
    ProjectConfiguration,
    TargetConfiguration,
    Tree,
    updateProjectConfiguration,
} from '@nrwl/devkit'

const registry = [
    ['npm', '@ntsrpc', 'https://registry.npmjs.org/'],
    ['github', '@stringke', 'https://npm.pkg.github.com/'],
]

export default async function (tree: Tree, schema: any) {
    const projects = getProjects(tree)
    const projectKeys = Array.from(projects.keys())

    projectKeys.forEach((key) => {
        const project: ProjectConfiguration = projects.get(key)

        if (project.name !== 'workspace' && project.projectType === 'library') {
            const sourceRoot = project.root

            if ('publish' in project.targets) {
                delete project.targets['publish']
            }

            let buildTarget = project.targets.build
            if (buildTarget.executor === '@nrwl/rollup:rollup') {
                buildTarget = {
                    project: `${sourceRoot}/package.json`,
                    outputPath: `dist/${project.name}/types`,
                    main: `${sourceRoot}/src/index.ts`,
                    tsConfig: `${sourceRoot}/tsconfig.lib.json`,
                    format: ['esm', 'cjs'],
                    generateExportsField: true,
                    buildableProjectDepsInPackageJsonType: 'dependencies',
                    assets: [],
                } as TargetConfiguration
            }
            project.targets.build = buildTarget

            const targets: string[] = []
            registry.forEach((item) => {
                const [name, scope, url] = item
                const targetName = `publish-${name}`
                project.targets[targetName] = {
                    executor: '@ntsrpc/deploy-npm:deploy',
                    options: {
                        access: 'restricted',
                        registry: url,
                        replaceScope: scope,
                    },
                }
                targets.push(targetName)
            })

            project.targets['publish'] = {
                executor: '@nrwl/workspace:run-commands',
                options: {
                    commands: targets.map(
                        (target) => `nx run ${project.name}:${target}`,
                    ),
                },
            }
        }

        updateProjectConfiguration(tree, project.name, project)
    })

    return () => {
        const registryTip = registry.map((item) => item[0]).join(' | ')
        console.log('='.repeat(30))
        console.log(
            `您已经设定了 ${registryTip} 公 ${registryTip} 个源的发布配置，请使用一下命令登陆，如果已登陆请跳过。`,
        )
        const loginCommand = registry
            .map((item) => item[2])
            .map((url) => `npm login --registry=${url}`)
            .join('\n')
        console.log(loginCommand)
        console.log('='.repeat(30))
    }
}
