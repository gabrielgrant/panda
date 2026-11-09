# Panda + Qwik

A [Qwik 2](https://qwik.dev/) app with Qwik Router, using `jsxFramework: 'qwik'`: the `styled` factory, patterns,
`createSlotRecipeContext` and `createRecipeContext` (see `src/routes/index.tsx`).

```shell
pnpm dev                     # dev server with SSR
pnpm build                   # client build and type check
pnpm qwik build preview      # client and preview (SSR) build
```

`e2e.mjs` checks the page in Chromium after SSR and resume: event handlers on `styled.*`, slot classes on every part,
variant changes from props and from `PropsProvider`, `unstyled`, and the missing-provider error.

```shell
pnpm e2e                     # against the dev server
pnpm e2e preview             # against the preview build
```

It uses the Chromium from `playwright-core`; set `CHROMIUM_PATH` to use another one.
