import { readFile, writeFile } from 'fs'
import { promisify } from 'util'

export const readFileAsync = promisify(readFile)

export const writeFileAsync = promisify(writeFile)
