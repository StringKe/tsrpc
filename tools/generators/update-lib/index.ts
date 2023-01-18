import { formatFiles, installPackagesTask, Tree } from '@nrwl/devkit'
import { libraryGenerator } from '@nrwl/workspace/generators'
import { getProjects } from 'nx/src/generators/utils/project-configuration'

export default async function (tree: Tree, schema: any) {
    const projects = getProjects(tree)
    console.log(projects)

    return () => {
        // nothing to do here
    }
}
