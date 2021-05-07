import { remove } from '../util/index';
import type Watcher from './watcher';

let uid = 0

/**
 * 观察订阅模式
 * 收集依赖，一个dep实例依赖的watcher有哪些
 * 数据更新时，依次通知dep中的watcher去执行update方法
 */

export default class Dep {
  static target: Watcher | null;
  id: number;
  subs: Array<Watcher>

  constructor() {
    this.id = uid++
    this.subs = []
  }

  addSub(sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub(sub: Watcher) {
    remove(this.subs, sub)
  }

  // 相互依赖? wtf
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this) // watcher中添加dep实例
    }
  }

  notify() {
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update() // queueWatcher
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget(target: Watcher) {
  targetStack.push(target)
  Dep.target = target // Dep.target就是当前正在执行的watcher
}

export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
