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
   * Class inheritance 类继承 构造一个Vue的子类
   * .vue定义的Component 实际文件是 export default {...} 一个普通的Object对象
   * 原型继承：纯对象转换成继承Vue的Sub构造器函数，然后对Sub本身扩展了一些属性
   */
  console.info(' --添加 Vue.extend')
  Vue.extend = function (extendOptions: Object): Function {
    console.log(extendOptions)
    extendOptions = extendOptions || {};
    const Super = this;
    const SuperId = Super.cid;
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId];
    }

    const name = extendOptions.name || Super.options.name;
    if (process.env.NODE_ENV !== "production" && name) {
      validateComponentName(name); // 自定义的组件名：正则验证规则 + 不要与html或内置的元素同名
    }

    const Sub = function VueComponent(options) { // 构造函数
      this._init(options); // 这不就是root上 new Vue() 初始化的逻辑，这里实例化子组件（说明每个子组件也是一个独立的vue实例，与vue3有本质区别）
    };
    console.log(Sub)
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
      initComputed(Sub); // 初始化computed，挂到Sub.prototype上
    }

    // allow further extension/mixin/plugin usage
    // 全局API
    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]; // 继承的子类拥有自己私有的资产-component, directive, filter
    });
    // enable recursive self-lookup 可以递归查找
    if (name) {
      Sub.options.components[name] = Sub;
    }

    // keep a reference to the super options at extension time. 扩展时保持对基类选项的引用
    // later at instantiation we can check if Super's options have
    // been updated. 稍后实例化时，我们可以取检查基类实例的选项是否更新
    Sub.superOptions = Super.options; // 保持Super的选项引用
    Sub.extendOptions = extendOptions; // .vue的object对象
    Sub.sealedOptions = extend({}, Sub.options); // 密封一份options副本

    // cache constructor 缓存，避免多次执行对同一个子组件重复构造
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
