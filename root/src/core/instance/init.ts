let uid = 0

export function initMixin(Vue) {
  Vue.prototype._init = function (options: object) {
    const vm = this
    vm._uid = uid++
  }
}
