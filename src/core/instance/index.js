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
  this._init(options);
}

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
renderMixin(Vue);

export default Vue;
