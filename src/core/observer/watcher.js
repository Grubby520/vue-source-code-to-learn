/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop,
} from "../util/index";

import { traverse } from "./traverse";
import { queueWatcher } from "./scheduler";
import Dep, { pushTarget, popTarget } from "./dep";

import type { SimpleSet } from "../util/index";

let uid = 0;

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * 一个组件或表达式对应一个watcher
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;

  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;

  before: ?Function;
  getter: Function;
  value: any;

  constructor(
    vm: Component,
    expOrFn: string | Function, // 外部传入的 updateComponent 赋值给this.getter
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 是不是mount阶段定义的renderWatcher
  ) {

    console.log('expOrFn: ', vm, expOrFn)
  
    this.vm = vm;
    if (isRenderWatcher) {
      vm._watcher = this; // 组件实例存储定义的renderWatcher的赋值操作的地方.专门用来监听 vm 上数据变化然后重新渲染的，所以它是一个渲染相关的 watcher
    }
    vm._watchers.push(this); // 还有其他类型的watcher：?
    // options
    if (options) {
      // !! 转成boolean值
      this.deep = !!options.deep;
      this.user = !!options.user;
      this.lazy = !!options.lazy;
      this.sync = !!options.sync;
      this.before = options.before;
    } else {
      this.deep = this.user = this.lazy = this.sync = false;
    }
    this.cb = cb;
    this.id = ++uid; // uid for batching
    this.active = true; // 默认值
    this.dirty = this.lazy; // for lazy watchers

    // 为什么要设计两个deps? 
    this.deps = [];
    this.newDeps = [];
    this.depIds = new Set();
    this.newDepIds = new Set();

    this.expression =
      process.env.NODE_ENV !== "production" ? expOrFn.toString() : "";
    // parse expression for getter
    if (typeof expOrFn === "function") {
      this.getter = expOrFn;
    } else {
      this.getter = parsePath(expOrFn);
      if (!this.getter) {
        this.getter = noop;
        process.env.NODE_ENV !== "production" &&
          warn(
            `Failed watching path: "${expOrFn}" ` +
              "Watcher only accepts simple dot-delimited paths. " +
              "For full control, use a function instead.",
            vm
          );
      }
    }
    this.value = this.lazy ? undefined : this.get(); // new 最终调用this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  /**
   * ?
   * 执行 this.getter，并重新收集依赖
   * this.getter 是实例化 watcher 时传递的第二个参数，一个函数或者字符串，比如：updateComponent 或者 parsePath 返回的读取 this.xx 属性值的函数
   * 为什么要重新收集依赖？
   *   因为触发更新说明有响应式数据被更新了，但是被更新的数据虽然已经经过 observe 观察了，但是却没有进行依赖收集，
   *   所以，在更新页面时，会重新执行一次 render 函数，执行期间会触发读取操作，这时候进行依赖收集
   */
  // mountComponent -> new Watcher() -> this.get()
  get() {
    pushTarget(this); // 收集依赖 Dep.target赋值为当前渲染watcher，并压栈
    let value;
    const vm = this.vm;
    try {
      value = this.getter.call(vm, vm); // 最终执行的是 vm._update(vm._render(), hydrating)
      // 依赖收集已完成
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`);
      } else {
        throw e;
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value); // 开启deep依赖，对象就会递归的evoke getters，每个key都会收集依赖
      }
      popTarget();
      this.cleanupDeps(); // 细节：数据依赖收集完成后，清空
    }
    return value;
  }

  /**
   * Add a dependency to this directive.
   * watcher中添加dep，dep中添加watcher, wtf ?
   */
  addDep(dep: Dep) {
    const id = dep.id;
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id);
      this.newDeps.push(dep); // watcher中加dep
      if (!this.depIds.has(id)) {
        dep.addSub(this); // dep中加watcher, 这个设计有点东西
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 这个方法设计得有点东西 wtf !
   */
  cleanupDeps() {
    let i = this.deps.length;
    while (i--) {
      const dep = this.deps[i];
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this);
      }
    }

    // 交换
    let tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;

    this.newDepIds.clear(); // clean up

    // 交换
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;

    this.newDeps.length = 0; // clean up

    /*
    这样设计的场景是什么?
    那么为什么需要做 deps 订阅的移除呢，在添加 deps 的订阅过程，已经能通过 id 去重避免重复订阅了。

    考虑到一种场景，我们的模板会根据 v-if 去渲染不同子模板 a 和 b，当我们满足某种条件的时候渲染 a 的时候，会访问到 a 中的数据，这时候我们对 a 使用的数据添加了 getter，做了依赖收集，那么当我们去修改 a 的数据的时候，理应通知到这些订阅者。那么如果我们一旦改变了条件渲染了 b 模板，又会对 b 使用的数据添加了 getter，如果我们没有依赖移除的过程，那么这时候我去修改 a 模板的数据，会通知 a 数据的订阅的回调，这显然是有浪费的。

    因此 Vue 设计了在每次添加完新的订阅，会移除掉旧的订阅，这样就保证了在我们刚才的场景中，如果渲染 b 模板的时候去修改 a 模板的数据，a 数据订阅回调已经被移除了，所以不会有任何浪费，真的是非常赞叹 Vue 对一些细节上的处理
    */
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update() {
    /* istanbul ignore else */
    if (this.lazy) {
      // 像computed懒加载的，将dirty设置为true，可以让computedGetter重新计算computed回调函数的执行结果
      this.dirty = true;
    } else if (this.sync) {
      // 同步执行，文档里似乎没有。
      this.run();
    } else {
      // 一般都走这里，放入执行队列里(异步更新队列 async)
      queueWatcher(this);
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  /**
   * 由 刷新队列函数 flushSchedulerQueue 调用，完成如下几件事：
   *   1、执行实例化 watcher 传递的第二个参数，updateComponent 或者 获取 this.xx 的一个函数(parsePath 返回的函数)
   *   2、更新旧值为新值
   *   3、执行实例化 watcher 时传递的第三个参数，比如用户 watcher 的回调函数
   */
  run() {
    if (this.active) {
      const value = this.get();
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value;
        this.value = value;
        if (this.user) {
          // ? 如果是用户 watcher，则执行用户传递的第三个参数 —— 回调函数，参数为 val 和 oldVal
          try {
            this.cb.call(this.vm, value, oldValue);
          } catch (e) {
            handleError(
              e,
              this.vm,
              `callback for watcher "${this.expression}"`
            );
          }
        } else {
          this.cb.call(this.vm, value, oldValue); // 执行回调函数
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  /**
   * 懒执行的 watcher 会调用该方法
   *   比如：computed，在获取 vm.computedProperty 的值时会调用该方法
   * 然后执行 this.get，即 watcher 的回调函数，得到返回值
   * this.dirty 被置为 false，作用是页面在本次渲染中只会一次 computed.key 的回调函数，
   *   这也是大家常说的 computed 和 methods 区别之一是 computed 有缓存的原理所在
   * 而页面更新后会 this.dirty 会被重新置为 true，这一步是在 this.update 方法中完成的
   */
  evaluate() {
    this.value = this.get(); // 存的就是handler回调函数
    this.dirty = false;
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend() {
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend(); // 收集这个watcher依赖的所有deps
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown() {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      // 如果要销毁这个vm，我们就跳过它，因为这是一个比较昂贵的开销
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this);
      }
      let i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
    }
  }
}
