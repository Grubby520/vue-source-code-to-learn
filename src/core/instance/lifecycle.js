/* @flow */

import config from "../config";
import Watcher from "../observer/watcher";
import { mark, measure } from "../util/perf";
import { createEmptyVNode } from "../vdom/vnode";
import { updateComponentListeners } from "./events";
import { resolveSlots } from "./render-helpers/resolve-slots";
import { toggleObserving } from "../observer/index";
import { pushTarget, popTarget } from "../observer/dep";

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling,
} from "../util/index";

// 全局变量
export let activeInstance: any = null; // 保持当前vue的执行上下文
export let isUpdatingChildComponent: boolean = false;

// 有点意思：执行-activeInstance为传入的vm，在执行返回的函数，又把activeInstance重置为执行之前的activeInstance
// ??? 实际场景是怎样 -> prevActiveInstance 与 当前这个 vm 是父子关系，wtf
export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance;
  activeInstance = vm;
  return () => {
    // 闭包的应用-暂存了上一次的activeInstance，执行后，activeInstance还是上一次的值，而不是这个vm
    // !!! 核心 太叼了：patch结束之后调用该函数，activeInstance 恢复之前的父实例，
    // 这样就完美地保证了 createComponentInstanceForVnode 整个深度遍历过程中，
    // 我们在实例化子组件的时候能传入当前子组件的父 Vue 实例，并在 _init 的过程中，通过 vm.$parent 把这个父子关系保留
    activeInstance = prevActiveInstance;
  };
}

// 初始化生命周期，在实例行添加了一系列的默认属性
export function initLifecycle(vm: Component) {
  const options = vm.$options;

  // locate first non-abstract parent
  let parent = options.parent;
  // ??? abstract属性的含义 - keep-alive 组件
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      // 向上查找，直到第一个 non-abstract parent
      parent = parent.$parent; // !!! 学习-逆向上递归
    }
    parent.$children.push(vm); // wtf ??? -> 把当前vm存储到父实例的 $children 中
  }

  vm.$parent = parent; // $parent 存储的 parent 实例
  vm.$root = parent ? parent.$root : vm; // 跟实例

  vm.$children = [];
  vm.$refs = {};

  vm._watcher = null;
  vm._inactive = null;
  vm._directInactive = false;
  vm._isMounted = false;
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false;
}

export function lifecycleMixin(Vue: Class<Component>) {
  // VNode渲染成真实DOM，负责更新页面，是首次渲染、也是后续更新和patch的入口
  console.info(' --添加 Vue.prototype._update')
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    console.log('._update: ', vnode);
    const vm: Component = this;
    // old
    const prevEl = vm.$el;
    const prevVnode = vm._vnode;
    // new
    const restoreActiveInstance = setActiveInstance(vm);
    vm._vnode = vnode; // ? 可怕的vnode, vnode是vm._reder() 返回的，而 vm.$vnode 是 parentVNode, 即为 vm._vnode.parent === vm.$vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render 首次渲染
     /**
      * vm.$el DOM对象
      * vnode render函数的返回值
      * hydrating 是否是服务端渲染
      * removeOnly 是个 transition-group 用的 ?
      */
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
    } else {
      // updates 响应式数据更新 新旧vnode
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    restoreActiveInstance(); // 更新完后
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null;
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm; // 更新实例引用
    }
    // if parent is an HOC (High Order Component), update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el;
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook. 能确保子级都能在父级更新hook里得到同步更新
  };

  // 强制更新
  console.info(' --添加 Vue.prototype.$forceUpdate')
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this;
    if (vm._watcher) {
      vm._watcher.update(); // 强制组件重新渲染（只影响自己和带slot的子组件）
    }
  };

  // 内部用的，完全销毁一个实例。清理它与其它实例的连接，解绑它的全部指令及事件监听器
  // 我们顶多用 beforeDestroy destroyed 钩子
  console.info(' --添加 Vue.prototype.$destroy')
  Vue.prototype.$destroy = function () {
    const vm: Component = this;
    if (vm._isBeingDestroyed) {
      // N多状态，优化手段之一，用boolean来判断（难道是异步任务? -> 可能多次调用）
      return;
    }
    callHook(vm, "beforeDestroy"); // 调用钩子回调函数
    vm._isBeingDestroyed = true;
    // remove self from parent
    const parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm); // 清理与父实例的连接
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown(); // 解绑事件监听器
    }
    let i = vm._watchers.length;
    while (i--) {
      vm._watchers[i].teardown(); // 解绑 _watchers 所有依赖
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--; // ? 移除对data observer 的引用关系
    }
    // call the last hook...
    vm._isDestroyed = true;
    // invoke destroy hooks on current rendered tree
    // 更新视图？ 销毁节点？ 触发子组件的销毁钩子函数，一层层的递归调用，钩子函数执行顺序-先子后父（类似mounted 过程）
    // 新的vnode为null， 即为销毁， 调用 invokeDestroyHook
    vm.__patch__(vm._vnode, null);
    // fire destroyed hook
    callHook(vm, "destroyed"); // 调用钩子回调函数
    // turn off all instance listeners.
    vm.$off(); // 解绑所有自定义监听器
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null; // 解除对自身的引用
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null; // ? 释放循环引用 (wtf,循环引用没毛病?)
    }
  };
}

/**
 * 核心：在mount阶段，实例化一个renderWatcher，监听vm上的数据变化以重新渲染
 * 并调用 prototype._render 方法生成虚拟DOM
 * 并最终调用 prototype._update 更新DOM
 * 
 * Watcher的作用？
 * 
 */
export function mountComponent(
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el;
  if (!vm.$options.render) {
    // 不考虑，正常是进不来的
    vm.$options.render = createEmptyVNode;
    if (process.env.NODE_ENV !== "production") {
      /* istanbul ignore if */
      if (
        (vm.$options.template && vm.$options.template.charAt(0) !== "#") ||
        vm.$options.el ||
        el
      ) {
        warn(
          "You are using the runtime-only build of Vue where the template " +
            "compiler is not available. Either pre-compile the templates into " +
            "render functions, or use the compiler-included build.",
          vm
        );
      } else {
        warn(
          "Failed to mount component: template or render function not defined.",
          vm
        );
      }
    }
  }
  callHook(vm, "beforeMount"); // 已经拿到了vnode

  let updateComponent;
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== "production" && config.performance && mark) {
    // performance配置，在浏览器开发工具的性能/时间线面板中启用对组件初始化、编译、渲染和打补丁的性能追踪
    updateComponent = () => {
      const name = vm._name;
      const id = vm._uid;
      const startTag = `vue-perf-start:${id}`;
      const endTag = `vue-perf-end:${id}`;

      mark(startTag);
      const vnode = vm._render();
      mark(endTag);
      measure(`vue ${name} render`, startTag, endTag); // 渲染性能

      mark(startTag);
      vm._update(vnode, hydrating);
      mark(endTag);
      measure(`vue ${name} patch`, startTag, endTag); // 打补丁性能
    };
  } else {
    updateComponent = () => {
      // question ? -> 什么时候调用的 ? -> 下面new Watcher()  mountComponent调用的时候
      // 五星级权重代码
      vm._update(vm._render(), hydrating); // _render生成VNode, _update渲染成真实的DOM
      // ._render() 对vm上的响应式数据进行访问，触发对应的getter
    };
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(
    vm,
    updateComponent, // this.getter
    noop,
    {
      before() { // this.before
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, "beforeUpdate"); // renderWatcher,数据更新时触发的回调
        }
      },
    },
    true /* isRenderWatcher */ // vm._watcher = this
  );
  hydrating = false;

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) { // $vnode存的是 parentVNode
    // 根实例
    vm._isMounted = true;
    callHook(vm, "mounted"); // 仅初始化执行一次
  }
  return vm;
}

export function updateChildComponent(
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== "production") {
    isUpdatingChildComponent = true;
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots;
  const oldScopedSlots = vm.$scopedSlots;
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
  );

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren || // has new static slots
    vm.$options._renderChildren || // has old static slots
    hasDynamicScopedSlot
  );

  vm.$options._parentVnode = parentVnode;
  vm.$vnode = parentVnode; // update vm's placeholder node without re-render

  if (vm._vnode) {
    // update child tree's parent
    vm._vnode.parent = parentVnode;
  }
  vm.$options._renderChildren = renderChildren;

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject;
  vm.$listeners = listeners || emptyObject;

  // update props, propsData 是父组件传递的 props 数据，vm 是子组件的实例
  if (propsData && vm.$options.props) {
    toggleObserving(false);
    const props = vm._props;
    const propKeys = vm.$options._propKeys || [];
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i];
      const propOptions: any = vm.$options.props; // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm);
    }
    toggleObserving(true);
    // keep a copy of raw propsData
    vm.$options.propsData = propsData;
  }

  // update listeners
  listeners = listeners || emptyObject;
  const oldListeners = vm.$options._parentListeners;
  vm.$options._parentListeners = listeners;
  updateComponentListeners(vm, listeners, oldListeners);

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context);
    vm.$forceUpdate();
  }

  if (process.env.NODE_ENV !== "production") {
    isUpdatingChildComponent = false;
  }
}

function isInInactiveTree(vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true;
  }
  return false;
}

export function activateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false;
    if (isInInactiveTree(vm)) {
      return;
    }
  } else if (vm._directInactive) {
    return;
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false;
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i]);
    }
    callHook(vm, "activated");
  }
}

export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true;
    if (isInInactiveTree(vm)) {
      return;
    }
  }
  if (!vm._inactive) {
    vm._inactive = true;
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i]);
    }
    callHook(vm, "deactivated");
  }
}

// 钩子函数
export function callHook(vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget();
  const handlers = vm.$options[hook];
  const info = `${hook} hook`;
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info);
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit("hook:" + hook); // 事件分发，组件通过监听 `hook:beforeDestroy` 事件；
  }
  popTarget();
}
