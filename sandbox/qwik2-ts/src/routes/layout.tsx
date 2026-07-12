import { Slot, component$ } from '@qwik.dev/core'
import { stack } from 'styled-system/patterns'
import { styled } from 'styled-system/jsx'

export default component$(() => {
  return (
    <div class={stack({ padding: '10', bg: 'gray.900', minHeight: '100vh', gap: '10' })}>
      <styled.main flex="1">
        <Slot />
      </styled.main>
    </div>
  )
})
