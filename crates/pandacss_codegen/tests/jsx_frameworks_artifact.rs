use crate::common::{artifact, file, paths, user_config};
use insta::assert_snapshot;
use pandacss_codegen::{ArtifactGraph, ArtifactId, CodegenContext, GenerateOptions};
use pandacss_config::{CodegenFormat, JsxStylePropsConfig, UserConfig};

fn config(framework: &str) -> UserConfig {
    user_config(serde_json::json!({
        "jsxFramework": framework,
        "jsxFactory": "panda",
        "utilities": {
            "backgroundColor": { "className": "bg", "values": "colors" }
        },
        "patterns": {
            "stack": {
                "jsxName": "Stack",
                "jsxElement": "section",
                "properties": {
                    "gap": { "property": "gap" },
                    "direction": { "property": "flexDirection" }
                }
            }
        }
    }))
}

#[test]
fn emits_pattern_jsx_for_non_react_frameworks() {
    for (framework, import_marker, runtime_marker, type_marker) in [
        (
            "preact",
            "from 'preact';",
            "forwardRef(function Stack",
            "import type { FunctionComponent } from 'preact';",
        ),
        (
            "qwik",
            "import { jsx } from '@qwik.dev/core';",
            "return jsx(panda[\"section\"], mergedProps)",
            "import type { FunctionComponent } from '@qwik.dev/core';",
        ),
        (
            "solid",
            "from 'solid-js';",
            "createComponent(panda[\"section\"], mergedProps)",
            "import type { Component } from 'solid-js';",
        ),
        (
            "vue",
            "from 'vue';",
            "defineComponent({",
            "import type { FunctionalComponent } from 'vue';",
        ),
    ] {
        let artifacts = ArtifactGraph.generate_all(
            CodegenContext::config_only(&config(framework)),
            GenerateOptions::default(),
        );
        let patterns = artifact(&artifacts, ArtifactId::JsxPatterns);

        assert_eq!(paths(patterns), vec!["jsx/stack.mjs", "jsx/stack.d.ts"]);

        let code = file(patterns, "jsx/stack.mjs");
        let dts = file(patterns, "jsx/stack.d.ts");

        assert!(
            code.contains(import_marker),
            "{framework} pattern import missing"
        );
        assert!(
            code.contains(runtime_marker),
            "{framework} pattern runtime missing"
        );
        assert!(
            code.contains("stack.raw(patternProps)")
                || code.contains("stackRaw(patternProps)")
                || code.contains("stackRaw(props)")
        );
        assert!(!code.starts_with("\"use client\";"));
        assert!(
            dts.contains(type_marker),
            "{framework} pattern type import missing"
        );
        assert!(dts.contains("export declare const Stack"));
    }
}

#[test]
fn emits_recipe_contexts_for_supported_non_react_frameworks() {
    for (framework, recipe_import, recipe_marker, slot_marker, type_marker) in [
        (
            "preact",
            "from 'preact';",
            "forwardRef(function WithContext",
            "forwardRef(function WithProvider",
            "ElementType, JsxFactoryOptions, UnstyledProps, WithForwardedProps } from '../types/jsx'",
        ),
        (
            "solid",
            "from 'solid-js/web';",
            "createComponent(StyledComponent, props)",
            "createMemo(() =>",
            "import type { Component, ComponentProps, ContextProviderComponent } from 'solid-js'",
        ),
        (
            "vue",
            "from 'vue';",
            "const PropsContext = Symbol('PropsContext')",
            "provide(SlotStylesContext, resolvedSlots)",
            "UnstyledProps, VModelProps, WithForwardedProps } from '../types/jsx'",
        ),
    ] {
        let artifacts = ArtifactGraph.generate_all(
            CodegenContext::config_only(&config(framework)),
            GenerateOptions::default(),
        );
        let recipe = artifact(&artifacts, ArtifactId::JsxCreateRecipeContext);
        let slot_recipe = artifact(&artifacts, ArtifactId::JsxCreateSlotRecipeContext);
        let index = file(artifact(&artifacts, ArtifactId::JsxIndex), "jsx/index.mjs");

        assert_eq!(
            paths(recipe),
            vec![
                "jsx/create-recipe-context.mjs",
                "jsx/create-recipe-context.d.ts"
            ]
        );
        assert_eq!(
            paths(slot_recipe),
            vec![
                "jsx/create-slot-recipe-context.mjs",
                "jsx/create-slot-recipe-context.d.ts"
            ]
        );

        let recipe_code = file(recipe, "jsx/create-recipe-context.mjs");
        let slot_code = file(slot_recipe, "jsx/create-slot-recipe-context.mjs");
        let slot_dts = file(slot_recipe, "jsx/create-slot-recipe-context.d.ts");

        assert!(
            recipe_code.contains(recipe_import),
            "{framework} recipe context import missing"
        );
        assert!(
            recipe_code.contains(recipe_marker),
            "{framework} recipe context runtime missing"
        );
        assert!(
            slot_code.contains(slot_marker),
            "{framework} slot recipe context runtime missing"
        );
        assert!(
            slot_dts.contains(type_marker),
            "{framework} slot recipe context types missing"
        );
        assert!(recipe_code.contains("from './helper'"));
        assert!(slot_code.contains("from './helper'"));
        assert!(
            slot_code.contains("data-slot"),
            "{framework} slot recipe context data-slot missing"
        );
        assert!(index.contains("export * from './create-recipe-context'"));
        assert!(index.contains("export * from './create-slot-recipe-context'"));
        assert!(!recipe_code.starts_with("\"use client\";"));
        assert!(!slot_code.starts_with("\"use client\";"));
    }
}

#[test]
fn emits_qwik_recipe_contexts_where_the_qwik_optimizer_reads_them() {
    let artifacts = ArtifactGraph.generate_all(
        CodegenContext::config_only(&config("qwik")),
        GenerateOptions {
            import_extensions: true,
            ..GenerateOptions::default()
        },
    );
    let recipe = artifact(&artifacts, ArtifactId::JsxCreateRecipeContext);
    let slot_recipe = artifact(&artifacts, ArtifactId::JsxCreateSlotRecipeContext);
    let index = file(artifact(&artifacts, ArtifactId::JsxIndex), "jsx/index.mjs");
    let jsx_types = file(artifact(&artifacts, ArtifactId::Types), "types/jsx.d.mts");

    assert!(jsx_types.contains("export interface RecipeContextOptions"));
    assert_eq!(
        paths(recipe),
        vec![
            "jsx/create-recipe-context.qwik.mjs",
            "jsx/create-recipe-context.qwik.d.mts"
        ]
    );
    assert_eq!(
        paths(slot_recipe),
        vec![
            "jsx/create-slot-recipe-context.qwik.mjs",
            "jsx/create-slot-recipe-context.qwik.d.mts"
        ]
    );
    assert!(index.contains("export * from './create-recipe-context.qwik.mjs'"));
    assert!(index.contains("export * from './create-slot-recipe-context.qwik.mjs'"));

    let recipe_code = file(recipe, "jsx/create-recipe-context.qwik.mjs");
    let slot_code = file(slot_recipe, "jsx/create-slot-recipe-context.qwik.mjs");
    let slot_dts = file(slot_recipe, "jsx/create-slot-recipe-context.qwik.d.mts");

    for code in [recipe_code, slot_code] {
        assert!(code.contains("from '@qwik.dev/core';"));
        assert!(code.contains("const PropsHost = component$((props) => {"));
        assert!(code.contains("const part = noSerialize("));
        assert!(code.contains("untrack(() => __tick.value++)"));
        assert!(code.contains("return SkipRender"));
        assert!(code.contains("function contextId(prefix, recipe, name, options)"));
        assert!(!code.starts_with("\"use client\";"));
    }
    assert!(recipe_code.contains("const RecipeConsumer = component$("));
    assert!(
        recipe_code.contains(
            "if (hostProps.class != null) hostProps.class = toClassName(hostProps.class)"
        )
    );
    assert!(
        slot_code.contains("const defaultClass = toClassName(part.options?.defaultProps?.class)")
    );
    assert!(slot_code.contains("const SlotProvider = component$("));
    assert!(slot_code.contains("const SlotConsumer = component$("));
    assert!(slot_code.contains("'data-slot': part.slot"));
    assert!(slot_dts.contains("export declare function createSlotRecipeContext"));
    assert!(slot_dts.contains("PropsProvider: ContextProviderComponent<"));
    assert!(slot_dts.contains("=> JSXOutput;"));
    assert!(slot_dts.contains(
        "createSlotRecipeContext<R extends SlotRecipeContextInput>(recipeInput: R, options?: RecipeContextOptions)"
    ));
}

#[test]
fn non_react_slot_recipe_contexts_preserve_style_prop_modes() {
    for (framework, marker) in [
        ("preact", "css.raw(slotStyles, restProps.css)"),
        ("qwik", "css.raw(slotStyles, restProps.css)"),
        ("solid", "css.raw(slotStyles, restProps.css)"),
        ("vue", "css.raw(slotStyles, restProps.css)"),
    ] {
        let mut config = config(framework);
        config.jsx_style_props = Some(JsxStylePropsConfig::Minimal);
        let artifacts = ArtifactGraph.generate_all(
            CodegenContext::config_only(&config),
            GenerateOptions::default(),
        );
        let slot_recipe = artifact(&artifacts, ArtifactId::JsxCreateSlotRecipeContext);
        let code = file(slot_recipe, paths(slot_recipe)[0]);

        assert!(
            code.contains(marker),
            "{framework} slot recipe context style prop mode missing"
        );
    }
}

#[test]
fn solid_slot_recipe_context_supports_function_default_props() {
    let artifacts = ArtifactGraph.generate_all(
        CodegenContext::config_only(&config("solid")),
        GenerateOptions::default(),
    );
    let code = file(
        artifact(&artifacts, ArtifactId::JsxCreateSlotRecipeContext),
        "jsx/create-slot-recipe-context.mjs",
    );

    assert!(code.contains("const createDefaultProps = (options) => {"));
    assert!(code.contains("const defaults = options?.defaultProps"));
    assert!(
        code.contains("typeof defaults === 'function' ? createMemo(defaults) : () => defaults")
    );
    assert!(code.contains(
        "const propsWithClass = defaults ? mergeProps(defaults, propsWithoutChildren) : propsWithoutChildren"
    ));
    assert!(code.contains("const slots = resolvedSlots()"));
    assert!(code.contains("const resolved = resolveProps(propsWithClass, slots[slot])"));
    assert!(code.contains("return local.children ?? defaultProps()?.children"));
    assert!(code.contains("const forwardedProps = {}"));
    assert!(code.contains("Object.defineProperty(forwardedProps, key, { get: () => variantProps[key], enumerable: true })"));
    assert!(code.contains("mergeProps(resolvedProps, forwardedProps, {"));
    assert!(code.contains("if (!isConfigRecipe) styles._classNameMap = slotRecipeFn.classNameMap"));
    assert!(code.contains("resolved.class = cx(resolved.class, slots._classNameMap?.[slot])"));
    assert!(
        code.contains("resolved.class = cx(resolved.class, resolvedSlots._classNameMap?.[slot])")
    );
    assert!(!code.contains("options?.defaultProps?.class"));
}

#[test]
fn emits_object_jsx_factory_for_non_react_frameworks() {
    for (framework, import_marker, runtime_marker, type_marker) in [
        (
            "preact",
            "from 'preact';",
            "forwardRef(function PandaComponent",
            "import type { ComponentProps, JSX } from 'preact';",
        ),
        (
            "qwik",
            "import { isSignal, jsx } from '@qwik.dev/core';",
            "toClassName(combinedProps.class), combinedProps.className",
            "import type { FunctionComponent, JSX, JSXChildren, JSXOutput, PropsOf } from '@qwik.dev/core';",
        ),
        (
            "solid",
            "from 'solid-js';",
            "createComponent(",
            "import type { Accessor, Component, ComponentProps, JSX } from 'solid-js';",
        ),
        (
            "vue",
            "from 'vue';",
            "defineComponent({",
            "import type { Component, FunctionalComponent, NativeElements } from 'vue';",
        ),
    ] {
        let artifacts = ArtifactGraph.generate_all(
            CodegenContext::config_only(&config(framework)),
            GenerateOptions::default(),
        );
        let factory = artifact(&artifacts, ArtifactId::JsxFactory);
        let helper = artifact(&artifacts, ArtifactId::JsxHelper);
        let types = artifact(&artifacts, ArtifactId::Types);

        assert_eq!(paths(factory), vec!["jsx/factory.mjs", "jsx/factory.d.ts"]);
        assert_eq!(paths(helper), vec!["jsx/helper.mjs", "jsx/helper.d.ts"]);
        let code = file(factory, "jsx/factory.mjs");
        let helper_code = file(helper, "jsx/helper.mjs");
        let jsx = file(types, "types/jsx.d.ts");

        assert!(
            code.contains(import_marker),
            "{framework} factory import missing"
        );
        assert!(
            code.contains(runtime_marker),
            "{framework} runtime marker missing"
        );
        assert!(code.contains("from './helper'"));
        assert!(
            helper_code.contains("function splitJsxProps")
                || helper_code.contains("function splitStyleProps")
        );
        assert!(helper_code.contains("serializeSplitStyles"));
        assert!(code.contains("__getCompoundVariantClasses__"));
        assert!(jsx.contains(type_marker), "{framework} type import missing");
        assert!(jsx.contains("export type Panda = JsxFactory & JsxElements"));
    }
}

#[test]
fn types_index_reexports_jsx_for_non_react_frameworks() {
    for framework in ["preact", "qwik", "solid", "vue"] {
        let artifacts = ArtifactGraph.generate_all(
            CodegenContext::config_only(&config(framework)),
            GenerateOptions {
                format: CodegenFormat::Ts,
                ..GenerateOptions::default()
            },
        );
        let types = artifact(&artifacts, ArtifactId::Types);

        assert!(
            file(types, "types/index.ts").contains("export type * from './jsx';"),
            "types/index.ts should re-export ./jsx for {framework}"
        );
    }
}

#[test]
fn qwik_factory_turns_class_lists_into_class_names() {
    let artifacts = ArtifactGraph.generate_all(
        CodegenContext::config_only(&config("qwik")),
        GenerateOptions::default(),
    );
    let code = file(
        artifact(&artifacts, ArtifactId::JsxFactory),
        "jsx/factory.mjs",
    );
    let start = code
        .find("function toClassName")
        .expect("toClassName helper");
    let end = start + code[start..].find("\n}\n").expect("helper end") + 2;

    assert_snapshot!(&code[start..end], @"
    function toClassName(value) {
      if (isSignal(value)) return toClassName(value.value)
      if (!value || typeof value === 'string') return value || undefined
      if (Array.isArray(value)) return cx(...value.map(toClassName))
      return cx(...Object.keys(value).filter((key) => value[key]))
    }
    ");
    assert!(code.contains("toClassName(combinedProps.class), combinedProps.className"));
}
