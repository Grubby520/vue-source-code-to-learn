/* @flow */

import { ASSET_TYPES } from "shared/constants";
import { defineComputed, proxy } from "../instance/state";
import { extend, mergeOptions, validateComponentName } from "../util/index";

export function initExtend(Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   * child构造函数继承和缓存父级构造函数
   */
  Vue.cid = 0;
  let cid = 1;

  /**
   * Class inheritance 类继承
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {};
    const Super = this;
    const SuperId = Super.cid;
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId];
    }

    const name = extendOptions.name || Super.options.name;
    if (process.env.NODE_ENV !== "production" && name) {
      validateComponentName(name);
    }

    const Sub = function VueComponent(options) {
      this._init(options);
    };
    // 原型继承的方式
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    Sub.options = mergeOptions(Super.options, extendOptions); // 合并策略
    Sub["super"] = Super; // 记录自己的基类

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps(Sub); // 初始化props，将props proxy到Sub.prototype._props，测试使用this._props能不能访问
    }
    if (Sub.options.computed) {
      initComputed(Sub); // 初始化计算属性，挂到Sub.prototype上
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type];
    });
    // enable recursive self-lookup 可以递归查找
    if (name) {
      Sub.options.components[name] = Sub;
    }

    // keep a reference to the super options at extension time. 扩展时保持对基类选项的引用
    // later at instantiation we can check if Super's options have
    // been updated. 稍后实例化时，我们可以取检查基类实例的选项是否更新
    Sub.superOptions = Super.options; // 保持Super的选项引用
    Sub.extendOptions = extendOptions; // 存的额外的配置
    Sub.sealedOptions = extend({}, Sub.options); // 拷贝Super选项的副本

    // cache constructor
    cachedCtors[SuperId] = Sub;
    return Sub;
  };
}

function initProps(Comp) {
  const props = Comp.options.props;
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key);
  }
}

function initComputed(Comp) {
  const computed = Comp.options.computed;
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key]);
  }
}
