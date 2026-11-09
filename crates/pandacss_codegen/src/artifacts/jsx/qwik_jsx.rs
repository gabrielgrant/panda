use super::jsx_helper::{type_import, value_import};
use super::react_jsx::FACTORY_SOURCE;
use crate::{CodegenContext, ImportDecl, Item, Module, RuntimeImport};

/// The React factory, minus `forwardRef` (Qwik has no refs to forward), rendering
/// through `jsx(type, props)`, the call Qwik 2 types publicly, with `class` instead of
/// `className`. `class` takes Qwik's `ClassList`, which `cx` alone would drop.
pub(super) fn module(
    ctx: CodegenContext<'_>,
    factory: &str,
    component: &str,
    upper: &str,
) -> Module {
    let source = FACTORY_SOURCE
        .replace(
            "  as?: ElementType\n  unstyled?: boolean\n  children?: ReactNode\n  className?: string",
            "  as?: ElementType\n  unstyled?: boolean\n  children?: JSXChildren\n  class?: ClassList | Signal<ClassList>\n  className?: string",
        )
        .replace(
            "ForwardRefExoticComponent<StyledProps & RefAttributes<unknown>> & StyledMarkers",
            "FunctionComponent<StyledProps> & StyledMarkers & { displayName?: string }",
        )
        .replace(
            "/* @__PURE__ */ forwardRef<unknown, StyledProps>(function __COMPONENT__(props, ref) {",
            "function __COMPONENT__(props: StyledProps) {",
        )
        .replace("  }) as StyledComponentFn", "  } as StyledComponentFn")
        .replace("      isCssProperty,\n    )", "      isCssProperty,\n      true,\n    )")
        .replace(
            "combinedProps.className",
            "toClassName(combinedProps.class), combinedProps.className",
        )
        .replace("function styledFn(", &format!("{TO_CLASS_NAME}\n\nfunction styledFn("))
        .replace(
            "return createElement(Element, {\n      ref,\n      ...forwardedProps,\n      ...elementProps,\n      ...htmlProps,\n      className,\n    }, children ?? combinedProps.children)",
            "return jsx(Element as string, {\n      ...forwardedProps,\n      ...elementProps,\n      ...htmlProps,\n      class: className,\n      children: children ?? combinedProps.children,\n    })",
        )
        .replace(
            "getDisplayName(DefaultElement)",
            "getDisplayName(DefaultElement as Parameters<typeof getDisplayName>[0])",
        )
        .replace("__FACTORY__", factory)
        .replace("__COMPONENT__", component)
        .replace("__UPPER__", upper);

    Module::new()
        .with_import(value_import(&["isSignal", "jsx"], "@qwik.dev/core"))
        .with_import(ImportDecl::value(
            ["cx", "cva"],
            &ctx.runtime_import(RuntimeImport::CssIndex, "../css/index"),
        ))
        .with_import(ImportDecl::value(
            [
                "composeCvaFn",
                "composeShouldForwardProps",
                "getDisplayName",
                "serializeSplitStyles",
                "mergeDefaultProps",
                "splitJsxProps",
            ],
            "./helper",
        ))
        .with_import(ImportDecl::value(["isCssProperty"], "./is-valid-prop"))
        .with_import(type_import(
            &["ClassList", "FunctionComponent", "JSXChildren", "Signal"],
            "@qwik.dev/core",
        ))
        .with_import(type_import(
            &["JsxRecipeFn", "ShouldForwardProp", "StyledMarkers"],
            "./helper",
        ))
        .with_import(type_import(&["RecipeDefinition"], "../types/recipe"))
        .with_import(type_import(&["ElementType", upper], "../types/jsx"))
        .with_item(Item::typed_source(source))
}

/// Qwik's `class` takes a `ClassList` (string, array, record or signal of one); `cx` only
/// joins strings. Shared with the Qwik recipe contexts.
pub(super) const TO_CLASS_NAME: &str = r"function toClassName(value: ClassList | Signal<ClassList> | undefined): string | undefined {
  if (isSignal(value)) return toClassName(value.value)
  if (!value || typeof value === 'string') return value || undefined
  if (Array.isArray(value)) return cx(...value.map(toClassName))
  return cx(...Object.keys(value).filter((key) => (value as Record<string, unknown>)[key]))
}";
