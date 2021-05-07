import Dep, { pushTarget, popTarget } from './dep'
import { parsePath } from '../util/index'
import { queueWatcher } from './scheduler'


let uid = 0

/**
 * 订阅者
 * 应用在 $watch() api 和 directives
 */
export default class Watcher {
  vm: any; // 实例
  expression: string;
  cb: Function;
  id: number;
  lazy: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  depIds: any;
  newDeps: Array<Dep>;
  newDepIds: any;
  getter: Function;
  value: any;

  constructor(
    vm: any,
    expOrFn: string | Function,
    cb: Function
  ) {
    this.vm = vm
    this.lazy = false
    this.cb = cb
    this.id = ++uid
    this.dirty = this.lazy
    this.deps = []
    this.depIds = new Set()
    this.newDeps = []
    this.newDepIds = new Set()
    this.expression = expOrFn.toString() || ''
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn) // watch vm.e.f's value ('e.f')
      if (!this.getter) {
        console.warn('Watcher only accepts simple dot-delimited paths.')
      }
    }
    this.value = this.lazy ? undefined : this.get()
  }

  /**
   * 执行this.getter 重新收集依赖
   * this.getter 是实例化 watcher 时传递的第二个参数，一个函数或者字符串，比如：updateComponent 或者 parsePath 返回的读取 this.xx 属性值的函数
   * 为什么要重新收集依赖？
   *   因为触发更新说明有响应式数据被更新了，但是被更新的数据虽然已经经过 observe 观察了，但是却没有进行依赖收集，
   *   所以，在更新页面时，会重新执行一次 render 函数，执行期间会触发读取操作，这时候进行依赖收集
   */
  get() {
    pushTarget(this)
    let value: any
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      throw e
    } finally {
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  addDep(dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDeps.push(dep)
      this.newDepIds.add(id)
      if (!this.depIds.has(id)) {
        dep.addSub(this) // dep中收集watcher实例
      }
    }
  }

  // 移除所有dep依赖
  cleanupDeps() {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this) // dep中移除watcher实例
      }
    }

    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp

    this.newDepIds.clear() // 清空depIds

    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp

    this.newDeps.length = 0 // 清空deps
  }


  // notify操作 依赖发生变化时会通知订阅者
  update() {
    queueWatcher(this) // 一般都走这里，放入执行队列里(异步更新队列 async)
  }

  run() {
    if (this.active) { // 激活状态，没有 teardown
      const value = this.get()
      if (value !== this.value) {
        const oldValue = this.value
        this.value = value
        this.cb.call(this.vm, value, oldValue) // 执行回调函数
      }
    }
  }

  evaluate() {
    this.value = this.get()
    this.dirty = false
  }

  depend() {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend() // 收集这个watcher依赖的所有deps
    }
  }

  // 把自己从所有依赖的订阅者列表中移除掉
  teardown() {
    if (this.active) {
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
