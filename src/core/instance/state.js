/* @flow */

import config from "../config";
import Watcher from "../observer/watcher";
import Dep, { pushTarget, popTarget } from "../observer/dep";
import { isUpdatingChildComponent } from "./lifecycle";

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving,
} from "../observer/index";

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute,
} from "../util/index";

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop,
};

// 设置代理，将key代理到target上的_props属性上
export function proxy(target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

/**
 * 两件事：
 *   数据响应式的入口：分别处理 props、methods、data、computed、watch
 *   优先级：props、methods、data、computed 对象中的属性不能出现重复，优先级和列出顺序一致
 *         其中 computed 中的 key 不能和 props、data 中的 key 重复，methods 不影响
 */
export function initState(vm: Component) {
  vm._watchers = [];
  const opts = vm.$options;
  // props 对象的所有属性设置响应式，代理到 vm 实例上，同时命名要避免使用_和$.开头
  if (opts.props) initProps(vm, opts.props);
  // 校验每个key都是函数，与props的key做判重处理
  if (opts.methods) initMethods(vm, opts.methods);
  if (opts.data) {
    /**
     * data 强烈推荐值是一个函数，且返回一个对象
     * 分别与methods，props的key做判重处理，调用proxy方法，为data的每个key代理到 vm._data
     * 调用observe方法，为 data 设置响应式
     */
    initData(vm);
  } else {
    observe((vm._data = {}), true /* asRootData */); // init root data
  }
  /**
   * vm._computedWatchers 创建watcher实例，默认lazy: true
   * 若!isSSR，给每个 computed key 创建new Watcher实例 (defineComputed)
   * 与computed，data,computed属性的key做判重处理
   */
  if (opts.computed) initComputed(vm, opts.computed);
  if (opts.watch && opts.watch !== nativeWatch) {
    // 遍历watch-key createWatcher 创建watcher实例
    // $watch 若‘immediate’为true，立即执行回调函数
    initWatch(vm, opts.watch);
  }
  /**
   * 其实到这里也能看出，computed 和 watch 在本质是没有区别的，都是通过 watcher 去实现的响应式
   * 非要说有区别，那也只是在使用方式上的区别，简单来说：
   *   1、watch：适用于当数据变化时执行异步或者开销较大的操作时使用，即需要长时间等待的操作可以放在 watch 中
   *   2、computed：其中可以使用异步方法，但是没有任何意义。所以 computed 更适合做一些同步计算
   */
}

function initProps(vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {};
  const props = (vm._props = {});
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  // 性能优化，缓存props的每个key
  const keys = (vm.$options._propKeys = []); // extra key: _propKeys
  const isRoot = !vm.$parent;
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false); // 根节点特殊处理
  }
  console.log(propsOptions);
  for (const key in propsOptions) {
    keys.push(key); // 缓存起来
    const value = validateProp(key, propsOptions, propsData, vm); // return propsData[key]的默认值
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== "production") {
      const hyphenatedKey = hyphenate(key);
      if (
        isReservedAttribute(hyphenatedKey) ||
        config.isReservedAttr(hyphenatedKey)
      ) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        );
      }
      defineReactive(props, key, value, () => {
        // 给对象定义响应式属性，这就是用的Object.defineProperty
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
              `overwritten whenever the parent component re-renders. ` +
              `Instead, use a data or computed property based on the prop's ` +
              `value. Prop being mutated: "${key}"`,
            vm
          );
        }
      });
    } else {
      defineReactive(props, key, value);
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key); // ? 代理key到vm实例对象的_props上面
    }
  }
  toggleObserving(true); // shouldObserve为true
}

function initData(vm: Component) {
  let data = vm.$options.data;
  // data.call(vm, vm) 这玩意儿还能把vm当参数？
  // 必须定义成function，返回Object / each instance can maintain an independent copy of the returned data object
  // 每个实例都是返回的数据对象的独立的副本
  data = vm._data = typeof data === "function" ? getData(data, vm) : data || {};
  if (!isPlainObject(data)) {
    data = {};
    process.env.NODE_ENV !== "production" &&
      warn(
        "data functions should return an object:\n" +
          "https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function",
        vm
      );
  }
  // proxy data on instance
  const keys = Object.keys(data);
  const props = vm.$options.props;
  const methods = vm.$options.methods;
  let i = keys.length;
  while (i--) {
    // 换成while迭代
    const key = keys[i];
    if (process.env.NODE_ENV !== "production") {
      // methods和 returned data object的key进行验重
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        );
      }
    }
    // props和returned data object的key进行验重
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== "production" &&
        warn(
          `The data property "${key}" is already declared as a prop. ` +
            `Use prop default value instead.`,
          vm
        );
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key); // 代理key到实例的_data属性上
    }
  }
  // observe data 为data对象上的数据设置响应式
  observe(data, true /* asRootData */);
}

export function getData(data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget();
  try {
    return data.call(vm, vm);
  } catch (e) {
    handleError(e, vm, `data()`);
    return {};
  } finally {
    popTarget();
  }
}

const computedWatcherOptions = { lazy: true };

function initComputed(vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = (vm._computedWatchers = Object.create(null)); // extra key: _computedWatchers
  // computed properties are just getters during SSR
  const isSSR = isServerRendering();

  for (const key in computed) {
    const userDef = computed[key];
    // 定义computed的属性，类型为function或者用get属性的object
    const getter = typeof userDef === "function" ? userDef : userDef.get;
    if (process.env.NODE_ENV !== "production" && getter == null) {
      warn(`Getter is missing for computed property "${key}".`, vm);
    }

    if (!isSSR) {
      // create internal watcher for the computed property. 为每个property创建watcher实例
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions // 默认lay:true 懒加载
      );
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      // 代理computed的属性到vm实例上，可以通过vm.computedKey访问计算属性，对各个引用属性做缓存管理
      defineComputed(vm, key, userDef);
    } else if (process.env.NODE_ENV !== "production") {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm);
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(
          `The computed property "${key}" is already defined as a prop.`,
          vm
        );
      }
    }
  }
}

export function defineComputed(
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering();
  // 设置构造属性描述符的get、set
  if (typeof userDef === "function") {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef);
    sharedPropertyDefinition.set = noop;
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop;
    sharedPropertyDefinition.set = userDef.set || noop;
  }
  if (
    process.env.NODE_ENV !== "production" &&
    sharedPropertyDefinition.set === noop
  ) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      );
    };
  }
  Object.defineProperty(target, key, sharedPropertyDefinition); // 对key设置拦截函数
}

// getter函数，当访问属性时，就会调用此函数。返回属性的值
function createComputedGetter(key) {
  // 计算属性进行缓存的原理
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      // watcher的dirty属性
      if (watcher.dirty) {
        watcher.evaluate(); // 更新并重置dirty为false
      }
      if (Dep.target) {
        watcher.depend(); // ?
      }
      return watcher.value;
    }
  };
}

function createGetterInvoker(fn) {
  return function computedGetter() {
    return fn.call(this, this); // 牛皮 this, this
  };
}

function initMethods(vm: Component, methods: Object) {
  const props = vm.$options.props;
  console.log(props);
  for (const key in methods) {
    if (process.env.NODE_ENV !== "production") {
      if (typeof methods[key] !== "function") {
        // key必须是一个函数
        warn(
          `Method "${key}" has type "${typeof methods[
            key
          ]}" in the component definition. ` +
            `Did you reference the function correctly?`,
          vm
        );
      }
      if (props && hasOwn(props, key)) {
        // methods和props不能有同名key
        warn(`Method "${key}" has already been defined as a prop.`, vm);
      }
      if (key in vm && isReserved(key)) {
        // 不要以$或_开头
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
            `Avoid defining component methods that start with _ or $.`
        );
      }
    }
    vm[key] =
      typeof methods[key] !== "function" ? noop : bind(methods[key], vm); // 指定vm组件实例作为this，并挂到vm上
  }
}

function initWatch(vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]; // 类型可以 string | Function | Object | Array
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]); // 传入回调数组，逐一调用 createWatcher
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler; // 对象，必须定义一个handler属性，值为function / string
  }
  if (typeof handler === "string") {
    // 不难发现：handler的值是一个字符串的话，就会去vm实例上去找有没有这个handler属性（methods上的方法）
    handler = vm[handler]; // 也可能找不到，是个undefined
  }
  return vm.$watch(expOrFn, handler, options);
}

export function stateMixin(Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {};
  dataDef.get = function () {
    return this._data;
  };
  const propsDef = {};
  propsDef.get = function () {
    return this._props;
  };
  if (process.env.NODE_ENV !== "production") {
    //
    dataDef.set = function () {
      warn(
        "Avoid replacing instance root $data. " +
          "Use nested data properties instead.",
        this
      );
    };
    // props是只读，不能设置setter
    propsDef.set = function () {
      warn(`$props is readonly.`, this);
    };
  }
  // 将data和props挂载到Vue.prototype上，直接使用this.$data访问data
  Object.defineProperty(Vue.prototype, "$data", dataDef);
  Object.defineProperty(Vue.prototype, "$props", propsDef);

  Vue.prototype.$set = set;
  Vue.prototype.$delete = del;

  /**
   *
   * @param {*} expOrFn 属性名
   * @param {*} cb  回调函数
   * @param {*} options 原始对象
   * @returns unwatchFn函数，用来停止触发回调
   */
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this; // 不能使用箭头函数
    // 直接调用 this.$watch( expOrFn, callback, [options] ) 兼容处理
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options);
    }
    options = options || {};
    // ? user是什么 表示是用户watcher还是渲染watcher
    options.user = true;
    const watcher = new Watcher(vm, expOrFn, cb, options);
    // 如果设置immediate为true，立即执行一次回调函数
    if (options.immediate) {
      pushTarget();
      try {
        cb.call(vm, watcher.value);
      } catch (error) {
        handleError(
          error,
          vm,
          `callback for immediate watcher "${watcher.expression}"`
        );
      }
      popTarget();
    }
    return function unwatchFn() {
      watcher.teardown(); // remove self from vm's watcher list
    };
  };
}
