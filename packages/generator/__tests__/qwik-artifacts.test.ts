import { fixtureDefaults } from '@pandacss/fixture'
import type { JsxFramework } from '@pandacss/types'
import { describe, expect, test } from 'vitest'
import { Generator } from '../src'

const createGenerator = (jsxFramework: JsxFramework) =>
  new Generator({
    ...fixtureDefaults,
    config: { ...fixtureDefaults.config, jsxFramework },
  } as typeof fixtureDefaults)

describe('qwik artifacts (v1)', () => {
  test('imports @builder.io/qwik only', () => {
    const generator = createGenerator('qwik')
    const codes = generator
      .getArtifacts()
      .flatMap((artifact) => artifact?.files ?? [])
      .map((file) => file.code ?? '')

    expect(codes.some((code) => code.includes('@builder.io/qwik'))).toBe(true)
    expect(codes.every((code) => !code.includes('@qwik.dev/core'))).toBe(true)
  })

  test('does not emit create-style-context', () => {
    const generator = createGenerator('qwik')
    const [artifact] = generator.getArtifacts(['jsx-create-style-context'])
    expect(artifact).toBeUndefined()

    const [index] = generator.getArtifacts(['jsx-patterns-index'])
    expect(index?.files.find((f) => f.file === 'index.mjs')?.code).not.toContain('create-style-context')
    expect(index?.files.find((f) => f.file === 'index.d.ts')?.code).not.toContain('create-style-context')
  })
})

describe('qwikv2 artifacts', () => {
  test('imports @qwik.dev/core only', () => {
    const generator = createGenerator('qwikv2')
    const codes = generator
      .getArtifacts()
      .flatMap((artifact) => artifact?.files ?? [])
      .map((file) => file.code ?? '')

    expect(codes.length).toBeGreaterThan(0)
    expect(codes.some((code) => code.includes('@qwik.dev/core'))).toBe(true)
    expect(codes.every((code) => !code.includes('@builder.io/qwik'))).toBe(true)
  })

  test('create-style-context is emitted with the .qwik extension for the optimizer', () => {
    const generator = createGenerator('qwikv2')
    const [artifact] = generator.getArtifacts(['jsx-create-style-context'])

    expect(artifact?.files.map((f) => f.file)).toMatchInlineSnapshot(`
      [
        "create-style-context.qwik.mjs",
        "create-style-context.d.ts",
      ]
    `)
  })

  test('jsx index exports create-style-context', () => {
    const generator = createGenerator('qwikv2')
    const [artifact] = generator.getArtifacts(['jsx-patterns-index'])
    const index = artifact?.files.find((f) => f.file === 'index.mjs')
    const indexDts = artifact?.files.find((f) => f.file === 'index.d.ts')

    expect(index?.code).toContain(`export * from './create-style-context.qwik.mjs'`)
    expect(indexDts?.code).toContain(`export * from './create-style-context'`)
  })

  test('jsx factory', () => {
    const generator = createGenerator('qwikv2')
    const [artifact] = generator.getArtifacts(['jsx-factory'])
    expect(artifact?.files.find((f) => f.file === 'factory.mjs')?.code).toMatchSnapshot()
  })

  test('create-style-context', () => {
    const generator = createGenerator('qwikv2')
    const [artifact] = generator.getArtifacts(['jsx-create-style-context'])
    expect(artifact?.files.find((f) => f.file === 'create-style-context.qwik.mjs')?.code).toMatchSnapshot()
    expect(artifact?.files.find((f) => f.file === 'create-style-context.d.ts')?.code).toMatchSnapshot()
  })

  test('jsx types', () => {
    const generator = createGenerator('qwikv2')
    const [artifact] = generator.getArtifacts(['types-jsx'])
    expect(artifact?.files.map((f) => f.file)).toContain('jsx.d.ts')
    expect(artifact?.files.find((f) => f.file === 'jsx.d.ts')?.code).toMatchSnapshot()
  })
})
