import type { Context } from '@pandacss/core'
import { outdent } from 'outdent'
import { match } from 'ts-pattern'

export function generateQwikV2CreateStyleContext(ctx: Context) {
  const jsxStyleProps = ctx.config.jsxStyleProps ?? 'all'

  const splitAndResolve = match(jsxStyleProps)
    .with(
      'all',
      () => outdent`
      const [htmlProps, styleProps, elementProps] = splitProps(restProps, normalizeHTMLProps.keys, isCssProperty)
      const { css: cssStyles, ...propStyles } = styleProps
      const { class: klass, className, ...forwardedProps } = elementProps
      const userClass = cx(klass, className)
      let resolvedClass
      if (unstyled) {
        resolvedClass = cx(css(propStyles, cssStyles), userClass)
      } else if (isConfigRecipe) {
        resolvedClass = cx(slotStyle, css(propStyles, cssStyles), userClass)
      } else {
        resolvedClass = cx(css(slotStyle, propStyles, cssStyles), userClass)
      }
      return [resolvedClass, { ...forwardedProps, ...normalizeHTMLProps(htmlProps) }]
    `,
    )
    .with(
      'minimal',
      () => outdent`
      const { css: cssStyles, class: klass, className, ...forwardedProps } = restProps
      const userClass = cx(klass, className)
      let resolvedClass
      if (unstyled) {
        resolvedClass = cx(css(cssStyles), userClass)
      } else if (isConfigRecipe) {
        resolvedClass = cx(slotStyle, css(cssStyles), userClass)
      } else {
        resolvedClass = cx(css(slotStyle, cssStyles), userClass)
      }
      return [resolvedClass, forwardedProps]
    `,
    )
    .otherwise(
      () => outdent`
      const { class: klass, className, ...forwardedProps } = restProps
      const userClass = cx(klass, className)
      let resolvedClass
      if (unstyled) {
        resolvedClass = userClass
      } else if (isConfigRecipe) {
        resolvedClass = cx(slotStyle, userClass)
      } else {
        resolvedClass = cx(css(slotStyle), userClass)
      }
      return [resolvedClass, forwardedProps]
    `,
    )

  const helperImports = match(jsxStyleProps)
    .with(
      'all',
      () => outdent`
      ${ctx.file.import('splitProps, normalizeHTMLProps', '../helpers')}
      ${ctx.file.import('isCssProperty', './is-valid-prop')}
    `,
    )
    .otherwise(() => '')

  return {
    js: outdent`
    import { Slot, component$, createContextId, jsx, useContext, useContextProvider, useStore } from '@qwik.dev/core'
    ${ctx.file.import('css, cx, sva', '../css/index')}
    ${helperImports}

    const styleContextNotFound = { __pandaStyleContextNotFound: true }

    // detected by marker property, not identity: Qwik serializes the
    // useContext default, so after resume the sentinel is a deserialized copy
    const isStyleContextNotFound = (value) => typeof value === 'object' && value !== null && '__pandaStyleContextNotFound' in value

    const missingProviderError = (recipeName, slot) => {
      const contextName = recipeName ? \`createStyleContext("\${recipeName}")\` : 'createStyleContext'
      return new Error(\`A component (slot: "\${slot}") cannot access \${contextName} because it's missing its Provider.\`)
    }

    const resolveStyledProps = (slotStyle, isConfigRecipe, unstyled, restProps) => {
      ${splitAndResolve}
    }

    const StyleProvider = component$((props) => {
      const {
        __ctx, __styles, __classNameMap, __slot, __isConfig, __unstyled, __cmp, __fwd, as: asElement, ...restProps
      } = props
      const store = useStore({ styles: props.__styles, classNameMap: props.__classNameMap })
      store.styles = props.__styles
      store.classNameMap = props.__classNameMap
      useContextProvider(createContextId(__ctx), store)
      const [resolvedClass, forwardedProps] = resolveStyledProps(__styles[__slot], __isConfig, __unstyled, restProps)
      return jsx(asElement ?? __cmp, { ...__fwd, ...forwardedProps, class: cx(resolvedClass, __classNameMap?.[__slot]), children: jsx(Slot, {}) })
    })

    const StyleRootProvider = component$((props) => {
      const { __ctx, __styles, __classNameMap, __cmp, ...restProps } = props
      const store = useStore({ styles: props.__styles, classNameMap: props.__classNameMap })
      store.styles = props.__styles
      store.classNameMap = props.__classNameMap
      useContextProvider(createContextId(__ctx), store)
      return jsx(__cmp, { ...restProps, children: jsx(Slot, {}) })
    })

    const StyleConsumer = component$((props) => {
      const {
        __ctx, __slot, __isConfig, __unstyled, __cmp, __fwd, __recipeName, as: asElement, ...restProps
      } = props
      const store = useContext(createContextId(__ctx), styleContextNotFound)
      if (isStyleContextNotFound(store)) throw missingProviderError(__recipeName, __slot)
      const [resolvedClass, forwardedProps] = resolveStyledProps(store.styles[__slot], __isConfig, __unstyled, restProps)
      return jsx(asElement ?? __cmp, { ...__fwd, ...forwardedProps, class: cx(resolvedClass, store.classNameMap?.[__slot]), children: jsx(Slot, {}) })
    })

    let anonymousContextCount = 0

    export function createStyleContext(recipe) {
      const isConfigRecipe = '__recipe__' in recipe
      const recipeName = isConfigRecipe && recipe.__name__ ? recipe.__name__ : undefined
      const contextName = \`panda.style-context.\${recipeName ?? \`anonymous-\${++anonymousContextCount}\`}\`
      const svaFn = isConfigRecipe ? recipe : sva(recipe.config)

      const getSlotStyles = (variantProps) => {
        return isConfigRecipe ? svaFn(variantProps) : svaFn.raw(variantProps)
      }

      const mergeDefaultProps = (props, options) => {
        const defaultProps = {
          ...(options?.dataAttr && recipeName ? { 'data-recipe': recipeName } : {}),
          ...options?.defaultProps,
        }
        return { ...defaultProps, ...props }
      }

      // props passing a custom shouldForwardProp bypass style processing and
      // are spread onto the element as-is (same bucket order as the factory)
      const splitForwardedProps = (restProps, options) => {
        if (!options?.shouldForwardProp) return [undefined, restProps]
        const forwarded = {}
        const rest = {}
        for (const key of Object.keys(restProps)) {
          if (key !== 'children' && options.shouldForwardProp(key, svaFn.variantKeys ?? [])) {
            forwarded[key] = restProps[key]
          } else {
            rest[key] = restProps[key]
          }
        }
        return [forwarded, rest]
      }

      const withRootProvider = (Component, options) => {
        const WithRootProvider = (props) => {
          const [variantProps, restProps] = svaFn.splitVariantProps(mergeDefaultProps(props, options))
          const slotStyles = getSlotStyles(variantProps)
          return jsx(StyleRootProvider, {
            __ctx: contextName,
            __styles: slotStyles,
            __classNameMap: svaFn.classNameMap,
            __cmp: Component,
            ...restProps,
          })
        }
        return WithRootProvider
      }

      const withProvider = (Component, slot, options) => {
        const WithProvider = (props) => {
          const { unstyled, ...propsWithDefaults } = mergeDefaultProps(props, options)
          const [variantProps, nonVariantProps] = svaFn.splitVariantProps(propsWithDefaults)
          const [forwarded, restProps] = splitForwardedProps(nonVariantProps, options)
          options?.forwardProps?.forEach((key) => {
            if (key in variantProps) restProps[key] = variantProps[key]
          })
          const slotStyles = getSlotStyles(variantProps)
          return jsx(StyleProvider, {
            __ctx: contextName,
            __styles: slotStyles,
            __classNameMap: svaFn.classNameMap,
            __slot: slot,
            __isConfig: isConfigRecipe,
            __unstyled: unstyled,
            __cmp: Component,
            __fwd: forwarded,
            ...restProps,
          })
        }
        return WithProvider
      }

      const withContext = (Component, slot, options) => {
        const WithContext = (props) => {
          const { unstyled, ...propsWithDefaults } = mergeDefaultProps(props, options)
          const [forwarded, restProps] = splitForwardedProps(propsWithDefaults, options)
          return jsx(StyleConsumer, {
            __ctx: contextName,
            __slot: slot,
            __isConfig: isConfigRecipe,
            __unstyled: unstyled,
            __cmp: Component,
            __fwd: forwarded,
            __recipeName: recipeName,
            ...restProps,
          })
        }
        return WithContext
      }

      return {
        withRootProvider,
        withProvider,
        withContext,
      }
    }
    `,
    dts: outdent`
    ${ctx.file.importType('SlotRecipeRuntimeFn, RecipeVariantProps', '../types/recipe')}
    ${ctx.file.importType('JsxHTMLProps, JsxStyleProps, Assign', '../types/system-types')}
    ${ctx.file.importType('JsxFactoryOptions, ComponentProps, DataAttrs, ElementType, UnstyledProps, AsProps', '../types/jsx')}
    import type { FunctionComponent } from '@qwik.dev/core'

    type SvaFn<S extends string = any> = SlotRecipeRuntimeFn<S, any>
    interface SlotRecipeFn {
      __type: any
      __slot: string
      (props?: any): any
    }
    type SlotRecipe = SvaFn | SlotRecipeFn

    type InferSlot<R extends SlotRecipe> = R extends SlotRecipeFn ? R['__slot'] : R extends SvaFn<infer S> ? S : never

    interface WithProviderOptions<P = {}> {
      defaultProps?: (Partial<P> & DataAttrs) | undefined
    }

    type StyleContextProvider<T extends ElementType, R extends SlotRecipe> = FunctionComponent<
      JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, Assign<RecipeVariantProps<R>, JsxStyleProps>>
    >

    type StyleContextRootProvider<T extends ElementType, R extends SlotRecipe> = FunctionComponent<
      ComponentProps<T> & UnstyledProps & RecipeVariantProps<R>
    >

    type StyleContextConsumer<T extends ElementType> = FunctionComponent<
      JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, JsxStyleProps>
    >

    export interface StyleContext<R extends SlotRecipe> {
      withRootProvider: <T extends ElementType>(
        Component: T,
        options?: WithProviderOptions<ComponentProps<T>> | undefined
      ) => StyleContextRootProvider<T, R>
      withProvider: <T extends ElementType>(
        Component: T,
        slot: InferSlot<R>,
        options?: JsxFactoryOptions<ComponentProps<T>> | undefined
      ) => StyleContextProvider<T, R>
      withContext: <T extends ElementType>(
        Component: T,
        slot: InferSlot<R>,
        options?: JsxFactoryOptions<ComponentProps<T>> | undefined
      ) => StyleContextConsumer<T>
    }

    /**
     * Create a style context from a slot recipe.
     *
     * Qwik notes:
     * - The produced components must be created at module top level (they are
     *   plain wrapper components around static \`component$\` hosts).
     * - The wrapped \`Component\` must be a tag name or a \`component$\` (it is
     *   passed across a serialization boundary). Inline (plain-function)
     *   components are not supported.
     */
    export declare function createStyleContext<R extends SlotRecipe>(recipe: R): StyleContext<R>
    `,
  }
}
