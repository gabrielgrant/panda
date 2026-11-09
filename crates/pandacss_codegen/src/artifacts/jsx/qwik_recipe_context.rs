//! Qwik recipe contexts. Hooks only run inside `component$`, and `component$`
//! props must be serializable, so `withContext`/`withProvider`/`PropsProvider`
//! return plain wrappers that hand serializable props (plus the recipe, marked
//! `noSerialize`) to static `component$` hosts. After resume, a host that needs
//! the recipe only re-renders once its own wrapper or its `PropsProvider` wrapper
//! ran again on the client, and that run passes the recipe back in.

use pandacss_config::JsxStylePropsConfig;

use super::jsx_helper::{type_import, value_import};
use super::react_recipe_context::{CREATE_RECIPE_CONTEXT_TYPES, CREATE_SLOT_RECIPE_CONTEXT_TYPES};
use super::solid_recipe_context::slot_resolve_props;
use super::{factory_name, style_props};
use crate::{CodegenContext, ImportDecl, Item, Module, RuntimeImport};

pub(super) fn recipe_module(ctx: CodegenContext<'_>) -> Module {
    base_module(ctx)
        .with_import(type_import(
            &[
                "RecipeDefinition",
                "RecipeRuntimeFn",
                "RecipeSelection",
                "RecipeVariantRecord",
            ],
            "../types/recipe",
        ))
        .with_import(type_import(
            &["Assign", "JsxHTMLProps", "JsxStyleProps"],
            "../types/system",
        ))
        .with_item(Item::typed_source(qwik_source(
            ctx,
            CREATE_RECIPE_CONTEXT_TYPES,
            CREATE_RECIPE_CONTEXT_RUNTIME,
        )))
}

pub(super) fn slot_recipe_module(ctx: CodegenContext<'_>) -> Module {
    let css_imports = match style_props(ctx) {
        JsxStylePropsConfig::All => vec!["cx", "sva"],
        JsxStylePropsConfig::Minimal | JsxStylePropsConfig::None => vec!["cx", "css", "sva"],
    };
    base_module(ctx)
        .with_import(value_import(
            &css_imports,
            &ctx.runtime_import(RuntimeImport::CssIndex, "../css/index"),
        ))
        .with_import(type_import(
            &[
                "RecipeSelection",
                "SlotRecipeDefinition",
                "SlotRecipeRuntimeFn",
                "SlotRecipeVariantRecord",
            ],
            "../types/recipe",
        ))
        .with_import(type_import(
            &[
                "Assign",
                "JsxHTMLProps",
                "JsxStyleProps",
                "SystemStyleObject",
            ],
            "../types/system",
        ))
        .with_item(Item::typed_source(
            qwik_source(
                ctx,
                CREATE_SLOT_RECIPE_CONTEXT_TYPES,
                CREATE_SLOT_RECIPE_CONTEXT_RUNTIME,
            )
            .replace("__RESOLVE_PROPS__", slot_resolve_props(style_props(ctx))),
        ))
}

fn base_module(ctx: CodegenContext<'_>) -> Module {
    let factory = factory_name(ctx);
    Module::new()
        .with_import(value_import(
            &[
                "Slot",
                "component$",
                "createContextId",
                "jsx",
                "noSerialize",
                "useContext",
                "useContextProvider",
                "useStore",
            ],
            "@qwik.dev/core",
        ))
        .with_import(value_import(&[factory.as_str()], "./factory"))
        .with_import(ImportDecl::value(
            ["getDisplayName", "mergeDefaultProps"],
            "./helper",
        ))
        .with_import(ImportDecl::value(
            ["toHash"],
            &ctx.runtime_import(RuntimeImport::Helpers, "../helpers"),
        ))
        .with_import(type_import(
            &[
                "AsProps",
                "ComponentProps",
                "ContextProviderComponent",
                "DataAttrs",
                "ElementType",
                "JsxFactoryOptions",
                "UnstyledProps",
                "WithForwardedProps",
            ],
            "../types/jsx",
        ))
        .with_import(type_import(
            &["FunctionComponent", "JSXOutput"],
            "@qwik.dev/core",
        ))
}

/// The React context types with Qwik's element and provider types, then the runtime.
fn qwik_source(ctx: CodegenContext<'_>, types: &str, runtime: &str) -> String {
    let types = types
        .replace("JSX.Element", "JSXOutput")
        .replace("Provider<", "ContextProviderComponent<");
    format!("{types}\n\n{SHARED_RUNTIME}\n\n{runtime}").replace("__FACTORY__", &factory_name(ctx))
}

const SHARED_RUNTIME: &str = r"type Props = Record<string, unknown>

interface PropsStore {
  value: Props | undefined
  recipe: unknown
}

const PropsHost: FunctionComponent<Props> = component$<Props>((props) => {
  const store = useStore<PropsStore>({ value: props.value as Props, recipe: props.__recipe }, { deep: false })
  store.value = props.value as Props
  store.recipe = props.__recipe
  useContextProvider(createContextId<PropsStore>(props.__ctx as string), store)
  return jsx(Slot, {})
})

// Context ids must match between the server and a resumed client, so they come from the recipe.
function contextKey(recipe: object): string {
  const { __name__, config } = recipe as { __name__?: string; config?: unknown }
  return (__name__ ?? toHash(JSON.stringify(config ?? recipe) ?? String(recipe))).replace(/[^\w.-]/g, '_')
}

function hostOptions<T extends object>(options: T | undefined): T | undefined {
  const shouldForwardProp = (options as { shouldForwardProp?: object } | undefined)?.shouldForwardProp
  return shouldForwardProp ? { ...options, shouldForwardProp: noSerialize(shouldForwardProp) } as T : options
}";

const CREATE_RECIPE_CONTEXT_RUNTIME: &str = r"type RecipeShape = Partial<Record<'__recipe__' | '__cva__' | 'base' | 'variants' | 'defaultVariants' | 'compoundVariants', unknown>>

function resolveRecipe(recipe: RecipeShape | null | undefined): RecipeShape {
  if (recipe == null) throw new Error('createRecipeContext requires a recipe')
  if (typeof recipe === 'function') return recipe
  if (recipe.base || recipe.variants || recipe.defaultVariants || recipe.compoundVariants) return recipe
  throw new Error('createRecipeContext requires a recipe')
}

const RecipeConsumer: FunctionComponent<Props> = component$<Props>((props) => {
  const { __ctx, __cmp, __options, __recipe, ...ownProps } = props
  const propsContext = useContext(createContextId<PropsStore>(__ctx as string), null)
  const recipe = __recipe ?? propsContext?.recipe
  const mergedProps = propsContext?.value ? mergeDefaultProps(propsContext.value, ownProps) : ownProps
  const StyledComponent = __FACTORY__(__cmp as ElementType, recipe as AnyRecipeDefinition, __options as JsxFactoryOptions<Props>)
  return jsx(StyledComponent as FunctionComponent<Props>, { ...mergedProps, children: jsx(Slot, {}) })
})

export function createRecipeContext<R extends RecipeContextRecipe>(recipeInput: R): RecipeContext<R> {
  const recipe = resolveRecipe(recipeInput as RecipeShape)
  const ctx = `panda-recipe-${contextKey(recipe)}`
  const usePropsContext = () => useContext(createContextId<PropsStore>(ctx), null)?.value

  const PropsProvider = (props: Props) =>
    jsx(PropsHost, { value: props.value, children: props.children, __ctx: ctx, __recipe: noSerialize(recipe) })

  const withContext = (Component: ElementType, options?: JsxFactoryOptions<Props>) => {
    const WithContext = (props: Props) =>
      jsx(RecipeConsumer, {
        ...props,
        children: props.children ?? options?.defaultProps?.children,
        __ctx: ctx,
        __cmp: Component,
        __options: hostOptions(options),
        __recipe: noSerialize(recipe),
      })
    WithContext.displayName = `withContext(${getDisplayName(Component as Parameters<typeof getDisplayName>[0])})`
    return WithContext
  }

  return {
    withContext,
    PropsProvider,
    usePropsContext,
  } as unknown as RecipeContext<R>
}";

const CREATE_SLOT_RECIPE_CONTEXT_RUNTIME: &str = r#"type SlotStyles = Record<string, unknown> & { _classNameMap?: Record<string, string> }

interface SlotRecipeShape {
  splitVariantProps?: unknown
  slots?: unknown
  config?: AnySlotRecipeDefinition
  __recipe__?: unknown
  __name__?: string
}

interface SlotRecipeRuntime {
  (props?: Props): SlotStyles
  raw(props?: Props): SlotStyles
  splitVariantProps(props: Props): [Props, Props]
  classNameMap?: Record<string, string>
  __recipe__?: unknown
  __name__?: string
}

interface SlotOptions {
  defaultProps?: Props
  forwardProps?: readonly string[]
}

interface SlotStore {
  slots: SlotStyles
}

function resolveSlotRecipe(recipe: SlotRecipeShape | null | undefined): SlotRecipeShape {
  if (recipe == null) throw new Error('createSlotRecipeContext requires a slot recipe')
  if (typeof recipe.splitVariantProps === 'function') return recipe
  if (recipe.slots) return recipe
  throw new Error('createSlotRecipeContext requires a slot recipe')
}

// Config recipes resolve each slot to a class string; `sva` resolves style objects.
const resolveProps = (props: Props, slotStyles: unknown): Props => {
  const { unstyled, ...restProps } = props
  if (unstyled) return restProps
  if (typeof slotStyles === 'string') return { ...restProps, class: cx(slotStyles, restProps.class as string) }
  __RESOLVE_PROPS__
}

const useSlotStyles = (ctx: string, recipeProp: unknown, ownProps: Props): [SlotStyles, Props, Props] => {
  const propsContext = useContext(createContextId<PropsStore>(`${ctx}-props`), null)
  const recipe = (recipeProp ?? propsContext?.recipe) as SlotRecipeRuntime
  const props = propsContext?.value ? mergeDefaultProps(propsContext.value, ownProps) : ownProps
  const [variantProps, restProps] = recipe.splitVariantProps(props)
  const slots = recipe.__recipe__ !== undefined ? recipe(variantProps) : recipe.raw(variantProps)
  if (recipe.__recipe__ === undefined) slots._classNameMap = recipe.classNameMap
  const store = useStore<SlotStore>({ slots }, { deep: false })
  store.slots = slots
  useContextProvider(createContextId<SlotStore>(ctx), store)
  return [slots, variantProps, restProps]
}

const renderSlot = (Component: unknown, slot: string, options: unknown, props: Props, slots: SlotStyles) =>
  jsx(__FACTORY__(Component as ElementType, {}, options as JsxFactoryOptions<Props>) as FunctionComponent<Props>, {
    ...props,
    class: cx(props.class as string, slots._classNameMap?.[slot]),
    'data-slot': slot,
    children: jsx(Slot, {}),
  })

const SlotRootProvider: FunctionComponent<Props> = component$<Props>((props) => {
  const { __ctx, __recipe, __cmp, __options, ...ownProps } = props
  const [, , otherProps] = useSlotStyles(__ctx as string, __recipe, ownProps)
  const defaultProps = (__options as SlotOptions | undefined)?.defaultProps
  const mergedProps = defaultProps ? mergeDefaultProps(defaultProps, otherProps) : otherProps
  return jsx(__cmp as FunctionComponent<Props>, { ...mergedProps, children: jsx(Slot, {}) })
})

const SlotProvider: FunctionComponent<Props> = component$<Props>((props) => {
  const { __ctx, __recipe, __cmp, __slot, __options, ...ownProps } = props
  const slot = __slot as string
  const options = __options as SlotOptions | undefined
  const [slots, variantProps, restProps] = useSlotStyles(__ctx as string, __recipe, ownProps)
  if (restProps.class == null && options?.defaultProps?.class) restProps.class = options.defaultProps.class
  const resolvedProps = resolveProps(restProps, slots[slot])
  options?.forwardProps?.forEach((key) => {
    if (key in variantProps) resolvedProps[key] = variantProps[key]
  })
  return renderSlot(__cmp, slot, options, resolvedProps, slots)
})

const SlotConsumer: FunctionComponent<Props> = component$<Props>((props) => {
  const { __ctx, __cmp, __slot, __options, __missing, ...ownProps } = props
  const store = useContext(createContextId<SlotStore>(__ctx as string), null)
  if (!store) throw new Error(__missing as string)
  const slot = __slot as string
  const options = __options as SlotOptions | undefined
  const nextProps = ownProps.class == null && options?.defaultProps?.class
    ? { ...ownProps, class: options.defaultProps.class }
    : ownProps
  return renderSlot(__cmp, slot, options, resolveProps(nextProps, store.slots[slot]), store.slots)
})

export function createSlotRecipeContext<R extends SlotRecipeContextInput>(recipeInput: R): SlotRecipeContext<R> {
  const recipe = resolveSlotRecipe(recipeInput as SlotRecipeShape)
  const isRuntimeRecipe = typeof recipe.splitVariantProps === 'function'
  const recipeName = isRuntimeRecipe && recipe.__name__ ? recipe.__name__ : undefined
  const contextName = recipeName ? `createSlotRecipeContext("${recipeName}")` : 'createSlotRecipeContext'
  const slotRecipeFn = isRuntimeRecipe ? recipe as SlotRecipeRuntime : sva(recipe.config ?? recipe as AnySlotRecipeDefinition) as unknown as SlotRecipeRuntime
  const ctx = `panda-slot-recipe-${contextKey(slotRecipeFn)}`
  const usePropsContext = () => useContext(createContextId<PropsStore>(`${ctx}-props`), null)?.value

  const host = (Host: FunctionComponent<Props>, Component: ElementType, options: SlotOptions | undefined, props: Props, extra?: Props) =>
    jsx(Host, {
      ...props,
      children: props.children ?? options?.defaultProps?.children,
      ...extra,
      __ctx: ctx,
      __cmp: Component,
      __options: hostOptions(options),
    })

  const PropsProvider = (props: Props) =>
    jsx(PropsHost, { value: props.value, children: props.children, __ctx: `${ctx}-props`, __recipe: noSerialize(slotRecipeFn) })

  const withRootProvider = (Component: ElementType, options?: SlotOptions) => {
    const WithRootProvider = (props: Props) => host(SlotRootProvider, Component, options, props, { __recipe: noSerialize(slotRecipeFn) })
    WithRootProvider.displayName = `withRootProvider(${getDisplayName(Component as Parameters<typeof getDisplayName>[0])})`
    return WithRootProvider
  }

  const withProvider = (Component: ElementType, slot: string, options?: SlotOptions) => {
    const WithProvider = (props: Props) => host(SlotProvider, Component, options, props, { __slot: slot, __recipe: noSerialize(slotRecipeFn) })
    WithProvider.displayName = `withProvider(${getDisplayName(Component as Parameters<typeof getDisplayName>[0])})`
    return WithProvider
  }

  const withContext = (Component: ElementType, slot: string, options?: SlotOptions) => {
    const componentName = getDisplayName(Component as Parameters<typeof getDisplayName>[0])
    const missing = `Component "${componentName}" (slot: "${slot}") cannot access ${contextName} because it's missing its Provider.`
    const WithContext = (props: Props) => host(SlotConsumer, Component, options, props, { __slot: slot, __missing: missing })
    WithContext.displayName = `withContext(${componentName})`
    return WithContext
  }

  return {
    withRootProvider,
    withProvider,
    withContext,
    PropsProvider,
    usePropsContext,
  } as unknown as SlotRecipeContext<R>
}"#;
