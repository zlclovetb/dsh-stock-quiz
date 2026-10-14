import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'src')
const lib = resolve(root, 'lib')
await rm(lib, { recursive: true, force: true })
await mkdir(lib, { recursive: true })
for (const file of ['index.js', 'market-review.js', 'questions.js', 'catalog.js', 'extra-questions.js', 'research.js']) {
  await cp(resolve(src, file), resolve(lib, file))
}

const bundleSource = (source) => source
  .replace(/^import .*\r?\n/gmu, '')
  .replace(/^export const /gmu, 'const ')
  .replace(/^export function /gmu, 'function ')
  .replace(/^export \{.*\}\r?\n?/gmu, '')

const catalog = bundleSource(await readFile(resolve(src, 'catalog.js'), 'utf8'))
const extras = bundleSource(await readFile(resolve(src, 'extra-questions.js'), 'utf8'))
const questions = bundleSource(await readFile(resolve(src, 'questions.js'), 'utf8'))
const research = bundleSource(await readFile(resolve(src, 'research.js'), 'utf8'))
const researchComponents = bundleSource(await readFile(resolve(src, 'research-components.js'), 'utf8'))
const client = (await readFile(resolve(src, 'client.js'), 'utf8'))
  .replace(/^import React, \{ useEffect, useState \} from 'react'\r?$/mu, "const React = require('react')\nconst { useEffect, useState } = React")
  .replace(/^import \{ createPortal \} from 'react-dom'\r?$/mu, "const { createPortal } = require('react-dom')")
  .replace(/^import .*\r?\n/gmu, '')
  .replace(/^export const inject /mu, 'const inject ')
  .replace(/^export function apply/mu, 'function apply')

const bundle = `window.__ModuleLoader__.load({
  id: 'dsh-stock-quiz',
  factory: (require) => {
    const module = { exports: {} }
${catalog}
${extras}
${questions}
${research}
${researchComponents}
${client}
    module.exports = { apply, inject }
    return module.exports
  },
})
`
await writeFile(resolve(lib, 'client.js'), bundle)
console.log('Built dsh-stock-quiz DSH client bundle')
