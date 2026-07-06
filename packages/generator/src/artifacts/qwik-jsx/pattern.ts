import type { Context } from '@pandacss/core'
import type { ArtifactFilters } from '@pandacss/types'
import { outdent } from 'outdent'
import { match } from 'ts-pattern'

export function generateQwikJsxPattern(ctx: Context, filters?: ArtifactFilters) {
  const { typeName, factoryName, styleProps: jsxStyleProps } = ctx.jsx

  const details = ctx.patterns.filterDetails(filters)

  return details.map((pattern) => {
    const { upperName, styleFnName, dashName, jsxName, props, blocklistType } = pattern
    const { description, jsxElement = 'div', deprecated } = pattern.config

    return {
      name: dashName,
      js: outdent`
      import { jsx } from '@qwik.dev/core'
      ${jsxStyleProps === 'minimal' ? ctx.file.import('mergeCss', '../css/css') : ''}
      ${ctx.file.import('splitProps', '../helpers')}
      ${ctx.file.import(styleFnName, `../patterns/${dashName}`)}
      ${ctx.file.import(factoryName, './factory')}

      export const ${jsxName} = /* @__PURE__ */ function ${jsxName}(props) {
        ${match(jsxStyleProps)
          .with(
            'none',
            () => outdent`
          const [patternProps, restProps] = splitProps(props, ${JSON.stringify(props)})
          
          const styleProps = ${styleFnName}(patternProps)
          const mergedProps = { ...restProps, css: styleProps }
          
          return jsx(${factoryName}.${jsxElement}, mergedProps)
          `,
          )
          .with(
            'minimal',
            () => outdent`
          const [patternProps, restProps] = splitProps(props, ${JSON.stringify(props)})
          
          const styleProps = ${styleFnName}(patternProps)
          const cssProps = { css: mergeCss(styleProps, props.css) }
          const mergedProps = { ...restProps, ...cssProps }

          return jsx(${factoryName}.${jsxElement}, mergedProps)
          `,
          )
          .with(
            'all',
            () => outdent`
          const [patternProps, restProps] = splitProps(props, ${JSON.stringify(props)})
          
          const styleProps = ${styleFnName}(patternProps)
          const mergedProps = { ...styleProps, ...restProps }
          
          return jsx(${factoryName}.${jsxElement}, mergedProps)
          `,
          )
          .exhaustive()}
      }
      `,

      dts: outdent`
      import type { Component } from '@qwik.dev/core'
      ${ctx.file.importType(`${upperName}Properties`, `../patterns/${dashName}`)}
      ${ctx.file.importType(typeName, '../types/jsx')}
      ${ctx.file.importType('Assign, DistributiveOmit', '../types/system-types')}

      export interface ${upperName}Props extends Assign<${typeName}<'${jsxElement}'>, DistributiveOmit<${upperName}Properties, ${
        blocklistType || '""'
      }>> {}

      ${ctx.file.jsDocComment(description, { deprecated })}
      export declare const ${jsxName}: Component<${upperName}Props>
      `,
    }
  })
}
