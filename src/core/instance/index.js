import { initMixin } from "./init";
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { eventsMixin } from "./events";
import { lifecycleMixin } from "./lifecycle";
import { warn } from "../util/index";

function Vue(options) {
  if (process.env.NODE_ENV !== "production" && !(this instanceof Vue)) {
    warn("Vue is a constructor and should be called with the `new` keyword");
  }
  this._init(options); // _init是在initMixin里定义的，wtf
}

// 下面功能都是给Vue.prototype上扩展一堆方法，
// 用构造函数而不是类来实现的原因：
// vue按功能把这些扩展分散到多个模块中去实现，而不是在一个模块里实现所有，这种方式是用 Class 难以实现的
// !!! 学习：方便代码管理和维护（按功能拆分模块）

initMixin(Vue);
/** 实例方法 / 【数据】
 * Vue.prototype
 * .$set
 * .$delete
 * .$watch
 */
stateMixin(Vue);
/** 实例方法 / 【事件】
 * Vue.prototype
 * .$on
 * .$once
 * .$off
 * .$emit
 */
eventsMixin(Vue);
/** 实例方法 / 【生命周期】
 * Vue.prototype
 * ._update
 * .$forceUpdate
 * .$destroy
 */
lifecycleMixin(Vue);
/**
 * ._render
 * .$nextTick
 */
renderMixin(Vue);

export default Vue;
