/* @flow */

import config from "../config";
import { initUse } from "./use";
import { initMixin } from "./mixin";
import { initExtend } from "./extend";
import { initAssetRegisters } from "./assets";
import { set, del } from "../observer/index";
import { ASSET_TYPES } from "shared/constants";
import builtInComponents from "../components/index";
import { observe } from "core/observer/index";

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive,
} from "../util/index";

// 初始化Vue本身的全局API
export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  const configDef = {};
  configDef.get = () => config; // get函数获取默认配置项
  if (process.env.NODE_ENV !== "production") {
    configDef.set = () => {
      // 不允许set
      warn(
        "Do not replace the Vue.config object, set individual fields instead."
      );
    };
  }
  console.info(' --添加 Vue.config')
  Object.defineProperty(Vue, "config", configDef);

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 除非你知道使用风险，否则不要轻易使用这些public api(而且会经常发生变化)
  console.info(' --添加 Vue.util')
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive,
  };

  console.info(' --添加 Vue.set')
  Vue.set = set;
  console.info(' --添加 Vue.delete')
  Vue.delete = del;
  console.info(' --添加 Vue.nextTick')
  Vue.nextTick = nextTick;

  // 2.6 explicit observable API
    console.info(' --添加 Vue.observable (2.6 explicit observable API)')
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  };

  console.info(' --添加 Vue.options: .components, .directives, .filters')
  Vue.options = Object.create(null);
  // components, directives, filters
  ASSET_TYPES.forEach((type) => {
    Vue.options[type + "s"] = Object.create(null)
  });

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  console.info(' --添加 Vue.options._base = Vue')
  Vue.options._base = Vue; // 实例化子组件的时候用它
  
  console.info(' --添加 内置组件 KeepAlive, Vue.options.components: .KeepAlive')
  extend(Vue.options.components, builtInComponents); // 内置组件 目前有 keep-alive、transition 和 transition-group

  initUse(Vue); // .use 安装插件 { install } 
  initMixin(Vue); // .mixin
  initExtend(Vue);  // .extend
  initAssetRegisters(Vue); // component directive filter
}
