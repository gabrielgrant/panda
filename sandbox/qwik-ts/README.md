# Panda + Qwik

A [Qwik 2](https://qwik.dev/) app with Qwik Router, using `jsxFramework: 'qwik'`: the `styled` factory, patterns,
`createSlotRecipeContext` and `createRecipeContext`. `/` uses the default `jsxStyleProps: 'all'`; `/minimal/` and
`/none/` use the outputs of `panda.minimal.config.ts` and `panda.none.config.ts`.

```shell
pnpm codegen                 # all three styled-system outputs
pnpm dev                     # dev server with SSR
pnpm build                   # client build and type check
pnpm qwik build preview      # client and preview (SSR) build
```

`e2e.mjs` checks each page in Chromium after SSR and resume: event handlers on `styled.*`, slot classes on every part,
variant changes from props and from `PropsProvider` (including parts rendered by a component that doesn't re-render),
plain function parts, defaults Qwik can't serialize, `shouldForwardProp`, `unstyled`, and the missing-provider error.

```shell
pnpm e2e                     # against the dev server
pnpm e2e preview             # against the preview build
```

It uses the Chromium from `playwright-core`; set `CHROMIUM_PATH` to use another one.
