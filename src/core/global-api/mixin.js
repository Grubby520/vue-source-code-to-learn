/* @flow */

import { mergeOptions } from "../util/index";
/**
 * 全局混入选项，会作用域之后创建的vue组件，这些实例会合并全局混入的选项
 */
export function initMixin(Vue: GlobalAPI) {
  console.info(' --添加 Vue.mixin')
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
}
