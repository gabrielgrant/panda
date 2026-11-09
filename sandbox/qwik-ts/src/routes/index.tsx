import { component$, useSignal, type PropsOf } from '@qwik.dev/core'
import type { DocumentHead } from '@qwik.dev/router'
import { css } from 'styled-system/css'
import { Stack, createRecipeContext, createSlotRecipeContext, styled } from 'styled-system/jsx'
import { badge, card } from 'styled-system/recipes'

const cardContext = createSlotRecipeContext(card)
const Card = cardContext.withProvider('article', 'root')
const CardTitle = cardContext.withContext('h2', 'title')
const CardBody = cardContext.withContext('p', 'body')

// Plain function components and defaults Qwik can't serialize.
const Note = (props: PropsOf<'aside'>) => <aside {...props} />
const CardNote = cardContext.withContext(Note, 'body')
const Glyph = () => <i data-testid="glyph">*</i>
const CardGlyph = cardContext.withContext('span', 'title', { defaultProps: { children: <Glyph /> } })

const badgeContext = createRecipeContext(badge)
const Badge = badgeContext.withContext('span')
const Tag = badgeContext.withContext('span', { shouldForwardProp: (prop) => prop === 'color' })

// These parts sit under a PropsProvider but render in a component that doesn't re-render
// when the provided value changes.
const ProvidedCard = component$(() => (
  <Card id="provided-card">
    <CardTitle>PropsProvider card</CardTitle>
    <CardNote id="note">Note</CardNote>
    <CardGlyph id="glyph" />
  </Card>
))

const ProvidedBadges = component$(() => (
  <>
    <Badge id="badge">Badge</Badge>
    <Tag id="tag" color="tomato">
      Tag
    </Tag>
  </>
))

export default component$(() => {
  const count = useSignal(0)
  const showOrphan = useSignal(false)
  const size = count.value % 2 === 0 ? 'md' : 'lg'

  return (
    <Stack gap="6">
      <div class={css({ bg: 'purple.600', color: 'wheat', padding: '8' })}>Welcome to Panda's Qwik Router app</div>

      <styled.button
        id="count"
        bg={count.value % 2 === 0 ? 'blue.500' : 'blue.700'}
        color="white"
        px="4"
        py="2"
        onClick$={() => count.value++}
      >
        Clicked {count.value} times
      </styled.button>

      <Card id="card" size={size}>
        <CardTitle>Slot recipe card</CardTitle>
        <CardBody>The size variant follows the click count.</CardBody>
        <CardBody id="bare" unstyled class="bare">
          Unstyled body
        </CardBody>
      </Card>

      <cardContext.PropsProvider value={{ size }}>
        <ProvidedCard />
      </cardContext.PropsProvider>

      <badgeContext.PropsProvider value={{ tone: count.value % 2 === 0 ? 'info' : 'danger' }}>
        <ProvidedBadges />
      </badgeContext.PropsProvider>

      <styled.button id="orphan" textDecoration="underline" onClick$={() => (showOrphan.value = true)}>
        Render a title without its card
      </styled.button>
      {showOrphan.value && <CardTitle>Orphan title</CardTitle>}
    </Stack>
  )
})

export const head: DocumentHead = {
  title: 'Welcome to Qwik',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description',
    },
  ],
}
