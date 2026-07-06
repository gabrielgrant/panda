import { fixtureDefaults } from '@pandacss/fixture'
import { describe, expect, test } from 'vitest'
import { Generator } from '../src'

const createQwikGenerator = () =>
  new Generator({
    ...fixtureDefaults,
    config: { ...fixtureDefaults.config, jsxFramework: 'qwik' },
  } as typeof fixtureDefaults)

describe('qwik artifacts', () => {
  test('imports @qwik.dev/core only', () => {
    const generator = createQwikGenerator()
    const artifacts = generator.getArtifacts()

    const codes = artifacts.flatMap((artifact) => artifact?.files ?? []).map((file) => file.code ?? '')
    expect(codes.length).toBeGreaterThan(0)
    expect(codes.some((code) => code.includes('@qwik.dev/core'))).toBe(true)
    expect(codes.every((code) => !code.includes('@builder.io/qwik'))).toBe(true)
  })

  test('create-style-context is emitted with the .qwik extension for the optimizer', () => {
    const generator = createQwikGenerator()
    const [artifact] = generator.getArtifacts(['jsx-create-style-context'])

    expect(artifact?.files.map((f) => f.file)).toMatchInlineSnapshot(`
      [
        "create-style-context.qwik.mjs",
        "create-style-context.d.ts",
      ]
    `)
  })

  test('jsx index exports create-style-context', () => {
    const generator = createQwikGenerator()
    const [artifact] = generator.getArtifacts(['jsx-patterns-index'])
    const index = artifact?.files.find((f) => f.file === 'index.mjs')
    const indexDts = artifact?.files.find((f) => f.file === 'index.d.ts')

    expect(index?.code).toContain(`export * from './create-style-context.qwik.mjs'`)
    expect(indexDts?.code).toContain(`export * from './create-style-context'`)
  })

  test('jsx factory', () => {
    const generator = createQwikGenerator()
    const [artifact] = generator.getArtifacts(['jsx-factory'])
    expect(artifact?.files.find((f) => f.file === 'factory.mjs')?.code).toMatchSnapshot()
  })

  test('create-style-context', () => {
    const generator = createQwikGenerator()
    const [artifact] = generator.getArtifacts(['jsx-create-style-context'])
    expect(artifact?.files.find((f) => f.file === 'create-style-context.qwik.mjs')?.code).toMatchSnapshot()
    expect(artifact?.files.find((f) => f.file === 'create-style-context.d.ts')?.code).toMatchSnapshot()
  })

  test('jsx types', () => {
    const generator = createQwikGenerator()
    const [artifact] = generator.getArtifacts(['types-jsx'])
    expect(artifact?.files.map((f) => f.file)).toContain('jsx.d.ts')
    expect(artifact?.files.find((f) => f.file === 'jsx.d.ts')?.code).toMatchSnapshot()
  })
})
