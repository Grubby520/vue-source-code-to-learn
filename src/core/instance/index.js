import { initMixin } from "./init";
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { eventsMixin } from "./events";
import { lifecycleMixin } from "./lifecycle";
import { warn } from "../util/index";

// Level 4
// Vue构造函数 - 为啥不用Class?
console.info('Level 4')
console.info(' 初始化 Vue 开始')
console.info(' --定义 Vue 构造函数')
function Vue(options) {
  if (process.env.NODE_ENV !== "production" && !(this instanceof Vue)) {
    warn("Vue is a constructor and should be called with the `new` keyword");
  }
  this._init(options); // _init是在initMixin里定义的，wtf
}

// 下面功能都是给Vue.prototype上扩展一堆方法，
// 为什么用构造函数而不是类来实现的原因：
// vue按功能把这些扩展分散到多个模块中去实现，而不是在一个模块里实现所有，这种方式是用 Class 难以实现的
// !!! 学习：方便代码管理和维护（模块按功能进行拆分）

/**
 * Vue.prototype
 * ._init
 */
console.info(' 初始化 Vue initMixin')
initMixin(Vue);
/** 实例方法 / 【数据】
 * Vue.prototype
 * .$data
 * .$props
 * .$set
 * .$delete
 * .$watch
 */
console.info(' 初始化 Vue stateMixin')
stateMixin(Vue);
/** 实例方法 / 【事件】
 * Vue.prototype
 * .$on
 * .$once
 * .$off
 * .$emit
 */
console.info(' 初始化 Vue eventsMixin')
eventsMixin(Vue);
/** 实例方法 / 【生命周期】
 * Vue.prototype
 * ._update
 * .$forceUpdate
 * .$destroy
 */
console.info(' 初始化 Vue lifecycleMixin')
lifecycleMixin(Vue);
/**
 * Vue.prototype
 * ._o _n _s _l _t ... 大量简写的用于渲染的工具函数
 * ._render
 * .$nextTick
 */
console.info(' 初始化 Vue renderMixin')
renderMixin(Vue);

export default Vue;
