/** @jsxImportSource @qwik.dev/core */
import { ssrRenderToDom } from '@qwik.dev/core/testing'
import { describe, expect, test } from 'vitest'
import { Box, Stack, styled } from '../../styled-system-qwikv2/jsx'
import { buttonWithCompoundVariants } from '../../styled-system-qwikv2/recipes'

const renderToDocument = async (jsx: any) => {
  const { document } = await ssrRenderToDom(jsx, { qwikLoader: true })
  return document as Document
}

const classOf = (document: Document, selector: string) => document.querySelector(selector)?.getAttribute('class')

describe('styled factory - cva', () => {
  const Button = styled('button', {
    base: {
      color: 'red.500',
      bg: 'blue.500',
      _hover: {
        color: 'red.600',
        bg: 'blue.600',
      },
    },
    variants: {
      size: {
        sm: {
          fontSize: 'sm',
          px: 'sm',
          py: 'xs',
        },
        md: {
          fontSize: 'md',
          px: 'md',
          py: 'sm',
        },
        lg: {
          fontSize: 'lg',
          px: 'lg',
          py: 'md',
        },
      },
    },
    compoundVariants: [
      {
        size: 'lg',
        css: { px: '123px', zIndex: 1 },
      },
    ],
  })

  test('base styles', async () => {
    const document = await renderToDocument(<Button>Click me</Button>)
    expect(classOf(document, 'button')).toBe('c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600')
  })

  test('variant styles', async () => {
    const document = await renderToDocument(<Button size="sm">Click me</Button>)
    expect(classOf(document, 'button')).toBe('c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_sm px_sm py_xs')
  })

  test('compound variants', async () => {
    const document = await renderToDocument(<Button size="lg">Click me</Button>)
    expect(classOf(document, 'button')).toBe(
      'c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_lg px_123px py_md z_1',
    )
  })

  test('custom className', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" size="sm">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe(
      'c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_sm px_sm py_xs custom-btn',
    )
  })

  test('style prop', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" mx="2">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe(
      'c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 mx_2 custom-btn',
    )
  })

  test('style prop with variant', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" size="sm" mx="2">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe(
      'c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_sm px_sm py_xs mx_2 custom-btn',
    )
  })

  test('css prop', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" css={{ color: 'red.100', fontSize: 'md' }}>
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe('c_red.100 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_md custom-btn')
  })

  test('css prop with variant', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" size="sm" css={{ color: 'red.100', fontSize: 'md' }}>
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe(
      'c_red.100 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_md px_sm py_xs custom-btn',
    )
  })

  test('all together', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" css={{ color: 'red.200', fontSize: 'xl' }} size="lg" mx="2">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe(
      'c_red.200 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_xl px_123px py_md z_1 mx_2 custom-btn',
    )
  })

  test('nested composition', async () => {
    const StyledButton = styled('button', {
      base: {
        fontWeight: 'semibold',
        h: '10',
      },
      variants: {
        visual: {
          solid: {
            color: 'white',
          },
          outline: {
            borderColor: 'currentColor',
          },
        },
      },
    })
    const WithSize = styled(StyledButton, {
      base: {
        colorPalette: 'blue',
      },
      variants: {
        size: {
          sm: { px: '2', fontSize: '12px' },
          lg: { px: '8', fontSize: '24px' },
        },
      },
    })
    const WithOverrides = styled(WithSize, {
      base: {
        borderWidth: '4px',
        h: '20',
      },
      variants: {
        visual: {
          outline: {
            colorPalette: 'red',
          },
        },
        size: {
          lg: { px: '12', fontSize: '32px' },
          '2xl': { px: '20', fontSize: '40px' },
        },
      },
    })

    const document = await renderToDocument(
      <WithOverrides visual="outline" size="lg">
        Click me
      </WithOverrides>,
    )
    expect(classOf(document, 'button')).toBe('fw_semibold h_20 color-palette_red bd-w_4px bd-c_currentColor px_12 fs_32px')

    const second = await renderToDocument(
      <WithOverrides visual="solid" size="2xl">
        Click me
      </WithOverrides>,
    )
    expect(classOf(second, 'button')).toBe('fw_semibold h_20 color-palette_blue bd-w_4px c_white px_20 fs_40px')
  })

  test('html props', async () => {
    const document = await renderToDocument(
      <styled.div htmlWidth={123} height="123">
        Click me
      </styled.div>,
    )
    const container = document.querySelector('div[width]')!
    expect(container.getAttribute('width')).toBe('123')
    expect(container.getAttribute('class')).toBe('h_123')
  })
})

describe('styled factory - button recipe', () => {
  const Button = styled('button', buttonWithCompoundVariants)

  test('base styles', async () => {
    const document = await renderToDocument(<Button>Click me</Button>)
    expect(classOf(document, 'button')).toBe('button button--visual_unstyled')
  })

  test('variant styles', async () => {
    const document = await renderToDocument(<Button size="sm">Click me</Button>)
    expect(classOf(document, 'button')).toBe('button button--visual_unstyled button--size_sm')
  })

  test('compound variants', async () => {
    const document = await renderToDocument(<Button visual="solid">Click me</Button>)
    expect(classOf(document, 'button')).toBe('button button--visual_solid c_blue')
  })

  test('custom className', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" size="sm">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe('button button--visual_unstyled button--size_sm custom-btn')
  })

  test('style prop', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" mx="2">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe('button button--visual_unstyled mx_2 custom-btn')
  })

  test('style prop with variant', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" size="sm" mx="2">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe('button button--visual_unstyled button--size_sm mx_2 custom-btn')
  })

  test('css prop', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" css={{ color: 'red.100', fontSize: 'md' }}>
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe('button button--visual_unstyled c_red.100 fs_md custom-btn')
  })

  test('css prop with variant', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" size="sm" css={{ color: 'red.100', fontSize: 'md' }}>
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe(
      'button button--visual_unstyled button--size_sm c_red.100 fs_md custom-btn',
    )
  })

  test('all together', async () => {
    const document = await renderToDocument(
      <Button class="custom-btn" css={{ color: 'red.200', fontSize: 'xl' }} size="md" visual="outline" mx="2">
        Click me
      </Button>,
    )
    expect(classOf(document, 'button')).toBe(
      'button button--visual_outline button--size_md c_red.200 mx_2 fs_xl custom-btn',
    )
  })

  test('box pattern', async () => {
    const document = await renderToDocument(<Box color="red.300">Click me</Box>)
    expect(classOf(document, 'div')).toBe('c_red.300')
  })

  test('stack pattern', async () => {
    const document = await renderToDocument(
      <Stack direction="column" color="red.400">
        Click me
      </Stack>,
    )
    expect(classOf(document, 'div')).toBe('d_flex flex-d_column gap_8px c_red.400')
  })

  test('array css prop', async () => {
    const document = await renderToDocument(
      <styled.div css={[{ color: 'blue.300', backgroundColor: 'yellow.300' }, { backgroundColor: 'green.300' }]}>
        array css prop
      </styled.div>,
    )
    expect(classOf(document, 'div')).toBe('c_blue.300 bg-c_green.300')
  })
})
