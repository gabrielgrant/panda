use pandacss_config::{JsxStylePropsConfig, PatternConfig};
use pandacss_shared::js_ident;

use super::jsx_helper::{type_import, value_import};
use crate::{CodegenContext, ImportDecl, Item, Module, RuntimeImport};

/// How a pattern component renders: React wraps it in `forwardRef` and calls
/// `createElement`; Qwik has no refs to forward and calls `jsx`.
#[derive(Clone, Copy)]
enum Renderer {
    React,
    Qwik,
}

pub(super) fn module(ctx: CodegenContext<'_>, name: &str, pattern: &PatternConfig) -> Module {
    module_for(ctx, name, pattern, Renderer::React)
}

pub(super) fn qwik_module(ctx: CodegenContext<'_>, name: &str, pattern: &PatternConfig) -> Module {
    module_for(ctx, name, pattern, Renderer::Qwik)
}

fn module_for(
    ctx: CodegenContext<'_>,
    name: &str,
    pattern: &PatternConfig,
    renderer: Renderer,
) -> Module {
    let factory = factory_name(ctx);
    let meta = ctx.pattern_jsx_meta(name, pattern);
    let pattern_fn = js_ident(name);
    let (runtime_import, framework) = match renderer {
        Renderer::React => (&["createElement", "forwardRef"][..], "react"),
        Renderer::Qwik => (&["jsx"][..], "@qwik.dev/core"),
    };

    let mut module = Module::new()
        .with_import(value_import(runtime_import, framework))
        .with_import(value_import(
            &[pattern_fn.as_str()],
            &format!("../patterns/{}", meta.stem),
        ))
        .with_import(value_import(
            &["splitProps"],
            &ctx.runtime_import(RuntimeImport::Helpers, "../helpers"),
        ))
        .with_import(value_import(&[factory.as_str()], "./factory"))
        .with_import(type_import(&["FunctionComponent"], framework))
        .with_import(type_import(
            &[meta.props_name.as_str()],
            &format!("../patterns/{}", meta.stem),
        ))
        .with_import(type_import(&[meta.html_props.as_str()], "../types/jsx"))
        .with_import(type_import(&["DistributiveOmit"], "../types/system"));

    if matches!(style_props(ctx), JsxStylePropsConfig::Minimal) {
        module = module.with_import(ImportDecl::value(
            ["mergeCss"],
            &ctx.runtime_import(RuntimeImport::CssCss, "../css/css"),
        ));
    }

    module.with_item(Item::typed_source(format!(
        "export interface {component_props} extends {props_name}, DistributiveOmit<{html_props}<{jsx_element:?}>, {omit_keys}> {{}}\n\n{runtime}",
        component_props = meta.component_props,
        props_name = meta.props_name,
        html_props = meta.html_props,
        jsx_element = meta.jsx_element,
        omit_keys = meta.omit_keys,
        runtime = pattern_runtime_body(
            &meta.jsx_name,
            &meta.component_props,
            &factory,
            &meta.jsx_element,
            &pattern_fn,
            style_props(ctx),
            renderer,
        ),
    )))
}

fn pattern_runtime_body(
    jsx_name: &str,
    component_props: &str,
    factory: &str,
    jsx_element: &str,
    pattern_fn: &str,
    mode: JsxStylePropsConfig,
    renderer: Renderer,
) -> String {
    let props = match mode {
        JsxStylePropsConfig::All => "...styleProps, ...restProps",
        JsxStylePropsConfig::Minimal => "...restProps, css: mergeCss(styleProps, props.css)",
        JsxStylePropsConfig::None => "...restProps, css: styleProps",
    };
    let body = format!(
        r"  const [patternProps, restProps] = splitProps(props, {pattern_fn}.propKeys)
  const styleProps = {pattern_fn}.raw(patternProps)"
    );

    match renderer {
        Renderer::React => format!(
            r"export const {jsx_name}: FunctionComponent<{component_props}> = /* @__PURE__ */ forwardRef<unknown, {component_props}>(function {jsx_name}(props, ref) {{
{body}
  const mergedProps = {{ ref, {props} }}
  return createElement({factory}[{jsx_element:?}], mergedProps)
}})"
        ),
        Renderer::Qwik => format!(
            r"export const {jsx_name}: FunctionComponent<{component_props}> = function {jsx_name}(props: {component_props}) {{
{body}
  const mergedProps = {{ {props} }}
  return jsx({factory}[{jsx_element:?}], mergedProps)
}}"
        ),
    }
}

fn factory_name(ctx: CodegenContext<'_>) -> String {
    ctx.jsx_factory().to_owned()
}

fn style_props(ctx: CodegenContext<'_>) -> JsxStylePropsConfig {
    ctx.config.jsx_style_props.unwrap_or_default()
}
