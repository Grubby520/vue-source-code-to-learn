// Level 3
console.info('Lvevl 3')
import Vue from './instance/index' // 来源
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

console.info(' 初始化全局API initGlobalAPI')
initGlobalAPI(Vue) // 初始化Vue本身的全局API
console.info(' 初始化全局API initGlobalAPI 结束')

console.info(' --添加 Vue.prototype.$isServer')
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

console.info(' --添加 Vue.prototype.$ssrContext')
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
console.info(' --添加 Vue.prototype.FunctionalRenderContext')
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

console.info(' --添加 Vue.version')
Vue.version = '__VERSION__'

export default Vue
