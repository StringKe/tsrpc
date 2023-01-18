import {
    addDependenciesToPackageJson,
    type GeneratorCallback,
    type Tree,
} from '@nrwl/devkit'

export function addDependencies(tree: Tree): GeneratorCallback {
    return addDependenciesToPackageJson(tree, {}, {})
}
