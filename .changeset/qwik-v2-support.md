---
'@pandacss/generator': minor
---

Add a `jsxFramework: 'qwikv2'` target for Qwik v2 (`@qwik.dev/core`). The existing `'qwik'` target is unchanged and
keeps generating Qwik v1 (`@builder.io/qwik`) artifacts.

- `'qwikv2'` generates the styled factory, JSX patterns and types against `@qwik.dev/core`, using the `jsx()` runtime
  entry (Qwik v2 dropped `h` from its public types).
- `createStyleContext` is generated for `'qwikv2'` (it remains unavailable for `'qwik'` and `'svelte'`). It matches
  the React API (`withRootProvider`, `withProvider`, `withContext`, `unstyled`, `defaultProps` including JSX children)
  and works over SSR plus resume: slot classes render on the server, and changing a variant prop on the client
  recomputes classes on all parts through a store-backed context. The wrapped component must be a tag name or a
  `component$`.
- The qwikv2 `create-style-context` file is emitted as `create-style-context.qwik.mjs` because the Qwik optimizer only
  processes `.jsx`/`.ts`/`.tsx` and `*.qwik.[mc]js` files.
- Fixed the qwik (v1) pattern output referencing an undefined `ref` when `jsxStyleProps` is `none`.
