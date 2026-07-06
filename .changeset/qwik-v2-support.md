---
'@pandacss/generator': minor
---

Add first-class Qwik v2 support to `jsxFramework: 'qwik'`.

- Generated qwik artifacts (styled factory, patterns, types) now import from `@qwik.dev/core` instead of the Qwik v1 package `@builder.io/qwik`. The previous output could not be used in a Qwik v2 app at all, and Qwik v2 is the supported line, so the target switched without a config knob. Qwik v1 users should stay on an older Panda version or drop `jsxFramework: 'qwik'`.
- `createStyleContext` is now generated for qwik (it was previously excluded). It matches the React API (`withRootProvider`, `withProvider`, `withContext`, `unstyled`, `defaultProps` including JSX children) and works over SSR plus resume: slot classes render on the server, and changing a variant prop on the client recomputes classes on all parts through a store-backed context. The wrapped component must be a tag name or a `component$`.
- The qwik `create-style-context` file is emitted as `create-style-context.qwik.mjs` because the Qwik optimizer only processes `.jsx`/`.ts`/`.tsx` and `*.qwik.[mc]js` files.
- Generated code calls `jsx()` instead of the legacy `h()` (which Qwik v2 still ships at runtime but dropped from its public types), and the jsx-pattern output no longer references an undefined `ref` when `jsxStyleProps` is `none`.
