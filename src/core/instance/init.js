/* @flow */

import config from "../config";
import { initProxy } from "./proxy";
import { initState } from "./state";
import { initRender } from "./render";
import { initEvents } from "./events";
import { mark, measure } from "../util/perf";
import { initLifecycle, callHook } from "./lifecycle";
import { initProvide, initInjections } from "./inject";
import { extend, mergeOptions, formatComponentName } from "../util/index";

let uid = 0;

export function initMixin(Vue: Class<Component>) {
  // 五星
  console.info(' --添加 Vue.prototype._init')
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this;
    // a uid
    // 每一个vue实例都有一个_uid，且依次递增
    vm._uid = uid++;

    let startTag, endTag;
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== "production" && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`;
      endTag = `vue-perf-end:${vm._uid}`;
      mark(startTag);
    }

    // a flag to avoid this being observed
    vm._isVue = true;
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      /**
       * 每个Component类型的子组件初始化时走这里，这里只做了一些性能优化
       * 将组件配置对象上的一些深层次属性放到 vm.$options 选项中，以提高代码的执行效率
       */
      initInternalComponent(vm, options);
    } else {
      /**
       * 初始化根组件时走这里，合并 Vue 的全局配置到根组件的局部配置，比如 Vue.component 注册的全局组件会合并到 根实例的 components 选项中
       * 至于每个子组件的选项合并则发生在两个地方：
       *   1、Vue.component 方法注册的全局组件在注册时做了选项合并
       *   2、{ components: { xx } } 方式注册的局部组件在执行编译器生成的 render 函数时做了选项合并，包括根组件中的 components 配置
       */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor), // constructor的 components,directives,filters,_base
        options || {},
        vm
      );
      console.log('vm.$options: ', vm.$options)
      /**
       * components: {}
          data: ƒ mergedInstanceDataFn()
          directives: {}
          el: "#app"
          filters: {}
          _base: ƒ Vue(options)
       */
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== "production") {
      // 把 vm 实例的属性代理到 vm._renderProxy
      initProxy(vm); //  vm._renderProxy = new Proxy(vm, handlers)
    } else {
      vm._renderProxy = vm;
    }
    // expose real self
    vm._self = vm; // 这tm不会无限循环?
    // 初始化组件实例的关系属性，如 $options, $parent, $root, $children, $refs
    initLifecycle(vm);
    /**
     * 初始化自定义事件，这里需要注意一点，所以我们在 <comp @click="handleClick" /> 上注册的事件，监听者不是父组件，
     * 而是子组件本身，也就是说事件的派发和监听者都是子组件本身，和父组件无关
     */
    initEvents(vm);
    // 处理渲染函数，得到 vm.$createElement
    initRender(vm);
    /**
     * $children: []
        $options: {components: {…}, directives: {…}, filters: {…}, el: "#app", _base: ƒ, …}
        $parent: undefined
        $refs: {}
        $root: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …}
        _directInactive: false
        _events: {}
        _hasHookEvent: false
        _inactive: null
        _isBeingDestroyed: false
        _isDestroyed: false
        _isMounted: false
        _isVue: true
        _renderProxy: Proxy {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …}
        _self: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …}
        _uid: 0
      _watcher: null
     */
    // 调用 'beforeCreate' lifecycle hook
    callHook(vm, "beforeCreate");
    // 初始化 inject 配置项
    initInjections(vm); // resolve injections before data/props
    // 数据响应式的核心入口，处理 props,methods,data,computed,watch (observe)
    initState(vm);
    // 解析配置项中的 provide 属性，挂载到 vm._provided 属性上面
    initProvide(vm); // resolve provide after data/props
    // 调用 'created' lifecycle hook
    callHook(vm, "created"); // 可以访问 props, data, computed, methods, watch

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== "production" && config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(`vue ${vm._name} init`, startTag, endTag);
    }

    // 如果配置项中有 ’el‘ 属性，程序自动调用 $mount 方法
    if (vm.$options.el) {
      // 挂载过程 它与平台、构建方式都有关
      vm.$mount(vm.$options.el); // compiler template渲染成最终的DOM
    }
    // 否则，手动调用 vm.$mount(el)，e.g. Component初始化时没有el的。因此它是自己接管了 $mount 的过程
  };
}

// 初始化子组件, 对options进行合并，将结果保留在 $options 中
export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  console.log('initInternalComponent: ', vm, options)
  // 合并$options, 同时添加了一堆_xx属性
  const opts = (vm.$options = Object.create(vm.constructor.options)); // vm.constructor 就是 Sub
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
  console.log(vm.$options)
  /**
   * 处理完成之后，vm.$options 大致如下
   */
  // vm.$options = {
  //   parent: Vue /*父Vue实例*/,
  //   propsData: undefined,
  //   _componentTag: undefined,
  //   _parentVnode: VNode /*父VNode实例*/,
  //   _renderChildren:undefined,
  //   __proto__: {
  //     components: { },
  //     directives: { },
  //     filters: { },
  //     _base: function Vue(options) {
  //         //...
  //     },
  //     _Ctor: {},
  //     created: [
  //       function created() {
  //         console.log('parent created')
  //       }, function created() {
  //         console.log('child created')
  //       }
  //     ],
  //     mounted: [
  //       function mounted() {
  //         console.log('child mounted')
  //       }
  //     ],
  //     data() {
  //       return {
  //         msg: 'Hello Vue'
  //       }
  //     },
  //     template: '<div>{{msg}}</div>'
  //   }
  // }
}

// 从组件<构造函数 - a plain object 才对>中解析配置对象 options，并合并基类选项
export function resolveConstructorOptions(Ctor: Class<Component>) {
  let options = Ctor.options;
  if (Ctor.super) {
    // 存在基类，递归解析基类的构造函数的选项
    const superOptions = resolveConstructorOptions(Ctor.super);
    const cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed, 基类构造函数选项已经发生改变
      // need to resolve new options. 需要重新设置新的配置
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976) 检查 Ctor.options 上是否有任何后期修改/附加的选项
      const modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      // 合并
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        // 如果设置了 'name' 属性，给Ctor设置一个快捷的名称，方便devtools
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}

/**
 * 解析构造函数选项中后续被修改/增加的选项
 * @param {*} Ctor
 * @returns 不一致的选项对象
 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified;
  const latest = Ctor.options;
  const sealed = Ctor.sealedOptions; // ? sealed
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}; // 小技巧-真正使用的时候才声明为对象
      modified[key] = latest[key]; // 记录不一致的选项
    }
  }
  return modified;
}
