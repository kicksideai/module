import { WippyVueElement, define, useEvents } from '@wippy-fe/webcomponent-vue'
import type { WippyElementConfig, WippyPropsSchema } from '@wippy-fe/webcomponent-vue'
import { lazyPage } from './lazy'
import type { ComponentProps } from './types.ts'
import stylesText from './styles.css?inline'
import pkg from '../package.json'

class AcmeStarterElement extends WippyVueElement<ComponentProps, Record<string, never>> {
  static get wippyConfig(): WippyElementConfig<ComponentProps> {
    return {
      propsSchema: pkg.wippy.props as WippyPropsSchema,
      hostCssKeys: ['themeConfigUrl'] as const,
      inlineCss: stylesText,
    }
  }

  static get vueConfig() {
    return {
      lazyConfig: lazyPage(
        () => import('./lazy-mount').then((module) => module.mountConfig),
        'Could not load this page. Reload the page to try again.',
        useEvents,
      ),
    }
  }
}

export async function webComponent() {
  return AcmeStarterElement
}

define(import.meta.url, AcmeStarterElement)
