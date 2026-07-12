# Panda + Qwik v2 ⚡️

Sandbox app for `jsxFramework: 'qwikv2'`: a [Qwik v2](https://qwik.dev/) app using
[Qwik Router](https://qwik.dev/docs/) with Panda's generated `styled` factory, patterns and
`createStyleContext` (see `src/routes/index.tsx`).

```shell
pnpm panda codegen   # generate styled-system/ (also runs as the prepare script)
pnpm dev             # dev server with SSR
pnpm build.types     # typecheck
pnpm build           # production build
```

Note: while Qwik v2 is in beta, production builds require a Rollup-based Vite (Vite 7). Vite 8 (Rolldown)
ignores Qwik's manual chunking, which produces a client manifest the SSR renderer cannot resolve event
handlers from.
