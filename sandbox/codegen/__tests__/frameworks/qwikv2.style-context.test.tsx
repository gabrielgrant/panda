/** @jsxImportSource @qwik.dev/core */
import { Slot, component$, type PropsOf } from '@qwik.dev/core'
import { ssrRenderToDom } from '@qwik.dev/core/testing'
import { describe, expect, test } from 'vitest'
import { createStyleContext } from '../../styled-system-qwikv2/jsx'
import { slotButton } from '../../styled-system-qwikv2/recipes'

const { withProvider, withContext, withRootProvider } = createStyleContext(slotButton)

const Root = withProvider('div', 'root')
const Icon = withProvider('span', 'icon')
const Label = withContext('span', 'root')

const renderToDocument = async (jsx: any) => {
  const { document } = await ssrRenderToDom(jsx, { qwikLoader: true })
  return document as Document
}

describe('style context - qwik', () => {
  test('withProvider', async () => {
    const document = await renderToDocument(
      <Root visual="outline" data-testid="root">
        <Icon data-testid="icon">Icon</Icon>
        <Label data-testid="label">Click me</Label>
      </Root>,
    )

    expect(document.querySelector('[data-testid="root"]')?.getAttribute('class')).toBe(
      'slot-button__root slot-button__root--visual_outline',
    )
    expect(document.querySelector('[data-testid="icon"]')?.getAttribute('class')).toBe(
      'slot-button__icon slot-button__icon--visual_unstyled',
    )
    expect(document.querySelector('[data-testid="label"]')?.getAttribute('class')).toBe(
      'slot-button__root slot-button__root--visual_outline',
    )
  })

  test('withContext', async () => {
    const document = await renderToDocument(
      <Root visual="solid" data-testid="root">
        <Label data-testid="label">Click me</Label>
      </Root>,
    )

    expect(document.querySelector('[data-testid="root"]')?.getAttribute('class')).toBe(
      'slot-button__root slot-button__root--visual_solid',
    )
    expect(document.querySelector('[data-testid="label"]')?.getAttribute('class')).toBe(
      'slot-button__root slot-button__root--visual_solid',
    )
  })

  test('unstyled', async () => {
    const document = await renderToDocument(
      <Root data-testid="root">
        <Label data-testid="label" unstyled class="bare">
          Click me
        </Label>
      </Root>,
    )

    expect(document.querySelector('[data-testid="label"]')?.getAttribute('class')).toBe('bare')
  })

  test('user class merges after slot classes', async () => {
    const document = await renderToDocument(
      <Root data-testid="root" class="custom">
        <Label>Click me</Label>
      </Root>,
    )

    expect(document.querySelector('[data-testid="root"]')?.getAttribute('class')).toBe(
      'slot-button__root slot-button__root--visual_unstyled custom',
    )
  })

  test('wraps component$ parts', async () => {
    const Part = component$<PropsOf<'button'>>(({ ...props }) => {
      return (
        <button {...props}>
          <Slot />
        </button>
      )
    })
    const ButtonPart = withContext(Part, 'icon')

    const document = await renderToDocument(
      <Root>
        <ButtonPart data-testid="part">Click me</ButtonPart>
      </Root>,
    )

    expect(document.querySelector('[data-testid="part"]')?.tagName.toLowerCase()).toBe('button')
    expect(document.querySelector('[data-testid="part"]')?.getAttribute('class')).toBe(
      'slot-button__icon slot-button__icon--visual_unstyled',
    )
  })

  test('defaultProps children', async () => {
    const IconWithDefault = withContext('span', 'icon', {
      defaultProps: { children: <svg data-testid="default-icon" /> },
    })

    const document = await renderToDocument(
      <Root>
        <IconWithDefault data-testid="icon" />
      </Root>,
    )

    expect(document.querySelector('[data-testid="default-icon"]')).toBeTruthy()
  })

  test('withRootProvider renders no styled element', async () => {
    const BareRoot = withRootProvider('section')

    const document = await renderToDocument(
      <BareRoot data-testid="root" visual="solid">
        <Label data-testid="label">Click me</Label>
      </BareRoot>,
    )

    expect(document.querySelector('[data-testid="root"]')?.getAttribute('class') || '').toBe('')
    expect(document.querySelector('[data-testid="label"]')?.getAttribute('class')).toBe(
      'slot-button__root slot-button__root--visual_solid',
    )
  })
})
