import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * 观察者模式
 * 一个dep就是一个可观察对象，可以有多个指令来订阅它
 */
export default class Dep {
  static target: Watcher | null
  id: number
  subs: Array<Watcher>

  constructor() {
    this.id = uid++
    this.subs = []
  }

  // 添加观察者
  addSub(sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除观察者
  removeSub(sub: Watcher) {
    remove(this.subs, sub)
  }

  // ? 当前执行的watcher中添加dep
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 通知订阅了这个观察者对象的所有订阅者，执行update方法
  notify() {
    const subs = this.subs.slice() // 首先，固定订阅者列表数据
    // ? config.async
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// 同一时间只能处理一个watcher
Dep.target = null
// 目标堆栈
const targetStack = []

export function pushTarget(target: Watcher) {
  targetStack.push(target) // last in
  Dep.target = target // 当前正在执行的watcher
}

export function popTarget() {
  targetStack.pop() // first out
  Dep.target = targetStack[targetStack.length - 1] // 始终指向最后的那个watcher

}