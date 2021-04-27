/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling,
} from "../util/index";
import { updateListeners } from "../vdom/helpers/index";

export function initEvents(vm: Component) {
  vm._events = Object.create(null);
  vm._hasHookEvent = false;
  // init parent attached events
  const listeners = vm.$options._parentListeners;
  if (listeners) {
    updateComponentListeners(vm, listeners);
  }
}

let target: any;

function add(event, fn) {
  target.$on(event, fn);
}

function remove(event, fn) {
  target.$off(event, fn);
}

function createOnceHandler(event, fn) {
  const _target = target;
  return function onceHandler() {
    const res = fn.apply(null, arguments);
    if (res !== null) {
      _target.$off(event, onceHandler);
    }
  };
}

export function updateComponentListeners(
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm;
  updateListeners(
    listeners,
    oldListeners || {},
    add,
    remove,
    createOnceHandler,
    vm
  );
  target = undefined;
}

export function eventsMixin(Vue: Class<Component>) {
  const hookRE = /^hook:/;
  // 监听实例上的自定义事件。单个或者数组集合，fn回调，查看 vm._events
  Vue.prototype.$on = function (
    event: string | Array<string>,
    fn: Function
  ): Component {
    const vm: Component = this;
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn); // 递归调用
      }
    } else {
      // 默认 _event 都是个 {}，还没用过$on给实例添加事件
      (vm._events[event] || (vm._events[event] = [])).push(fn);
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 注册时用一个boolean标识标记有对hookEvent添加额外的逻辑 查看 _hasHookEvent
      if (hookRE.test(event)) {
        vm._hasHookEvent = true;
      }
    }
    return vm;
  };

  // 只执行一次的设计：对fn进行一次包装，on函数里调用 $off，再执行fn
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this;
    function on() {
      vm.$off(event, on); // 一旦执行，就 $off
      fn.apply(vm, arguments); // 细节-先移除监听器，再执行回调fn
    }
    on.fn = fn;
    vm.$on(event, on); // 还是调用的$on, 只是对回调fn做了特殊处理
    return vm;
  };

  Vue.prototype.$off = function (
    event?: string | Array<string>,
    fn?: Function
  ): Component {
    const vm: Component = this;
    // !!! 这种执行流-值得学习
    // all
    if (!arguments.length) {
      // 没有参数，则移除所有的自定义事件监听器
      vm._events = Object.create(null); // plain object
      return vm;
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn); // 数组，递归执行
      }
      return vm;
    }
    // specific event
    const cbs = vm._events[event];
    if (!cbs) {
      // 兼容异常
      return vm;
    }
    if (!fn) {
      vm._events[event] = null; // 只移除该event所有的监听器
      return vm;
    }
    // specific handler
    let cb;
    let i = cbs.length;
    while (i--) {
      cb = cbs[i];
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1); // 找到定义时的fn， splice 移除 （那要传入注册时的那个fn，得是同一个fn，wtf）
        break;
      }
    }
    return vm;
  };

  // 去 _event中拿到event的fn，依次执行
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this;
    if (process.env.NODE_ENV !== "production") {
      const lowerCaseEvent = event.toLowerCase();
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        // 规范里也提及到，html的attributes属性是不区分大小写的，所以在使用in-DOM模板的时候，v-on的事件名不要用小驼峰写法
        // 而是使用短横线分割写法
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
            `${formatComponentName(
              vm
            )} but the handler is registered for "${event}". ` +
            `Note that HTML attributes are case-insensitive and you cannot use ` +
            `v-on to listen to camelCase events when using in-DOM templates. ` +
            `You should probably use "${hyphenate(
              event
            )}" instead of "${event}".`
        );
      }
    }
    let cbs = vm._events[event]; // 获取event对应的fn回调函数数组
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs;
      // 需要传递提供的参数 arguments获取
      const args = toArray(arguments, 1); // 把arguments这种Array-lick object转成真正的Array
      const info = `event handler for "${event}"`;
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 依次执行回调，核心就是 handler.apply(vm, args) || handler.call(vm)
        // !!!学习：抽象出一个方法，执行函数，并包含统一的异常处理的方法
        invokeWithErrorHandling(cbs[i], vm, args, vm, info);
      }
    }
    return vm;
  };
}
