import { component$, useSignal } from '@qwik.dev/core'
import type { DocumentHead } from '@qwik.dev/router'
import { css } from 'styled-system/css'
import { Stack, styled } from 'styled-system/jsx'
import { createStyleContext } from 'styled-system/jsx'
import { card } from 'styled-system/recipes'

const { withProvider, withContext } = createStyleContext(card)

const Card = withProvider('article', 'root')
const CardTitle = withContext('h2', 'title')
const CardBody = withContext('div', 'body')

export default component$(() => {
  const count = useSignal(0)
  return (
    <Stack gap="6">
      <div
        class={css({
          bg: 'purple.600',
          color: 'wheat',
          padding: '8',
        })}
      >
        Welcome to Panda's Qwik app
      </div>

      <styled.button
        bg="blue.500"
        color="white"
        px="4"
        py="2"
        borderRadius="md"
        onClick$={() => count.value++}
      >
        Clicked {count.value} times
      </styled.button>

      <Card size={count.value % 2 === 0 ? 'md' : 'lg'}>
        <CardTitle>Slot recipe card</CardTitle>
        <CardBody>
          Styled with <code>createStyleContext</code>, click the button to toggle the size variant.
        </CardBody>
      </Card>
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
