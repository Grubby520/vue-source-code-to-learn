/* @flow */
// 2
import type Watcher from "./watcher";
import { remove } from "../util/index";
import config from "../config";

let uid = 0; // 每个dep都有一个uid

/** 
 * Dep -> Dependence 依赖
 * Dep实际上是对 Watch 的一种管理，Dep 脱离 Watcher 单独存在是没有意义的
 * Dep 和 Watcher 这个相互依赖的关系，设计得很是巧妙呢 wtf !
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 观察者模式
 * 收集依赖，一个dep实例依赖的watcher有哪些
 * 数据更新时，依次通知dep中的watcher去执行update方法
 *
 */
export default class Dep {
  static target: ?Watcher; // 静态属性：全局唯一的 Watcher (nice: 同一时间只能有一个全局的Watcher实例被计算)
  id: number;
  // subs -> subscribers
  subs: Array<Watcher>; // 依赖的 Watcher 数组

  constructor() {
    this.id = uid++;
    this.subs = [];
  }

  addSub(sub: Watcher) {
    this.subs.push(sub); // 反过来 把 watcher 订阅到这个数据持有的 dep 的 subs中，
    // why? 为后续数据变化时，通知对应的subscribers，即为 subs
  }

  removeSub(sub: Watcher) {
    remove(this.subs, sub);
  }

  // ? watcher中添加dep
  depend() {
    // console.log(Dep.target);
    if (Dep.target) { // watcher.js -> line-103 this.get() -> pushTarget() 已经赋为渲染Watcher
      Dep.target.addDep(this); // watcher里存储dep，后面有什么作用?
    }
  }

  // notify 数据更新，通过dep中的所有watcher，执行update()
  notify() {
    // stabilize the subscriber list first
    const subs = this.subs.slice(); // 浅拷贝
    if (process.env.NODE_ENV !== "production" && !config.async) {
      // 不能是异步
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id); // 排序
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update(); // 触发update方法
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 同一时间只有一个watcher
Dep.target = null;
const targetStack = []; // 目标堆栈

export function pushTarget(target: ?Watcher) {
  targetStack.push(target); // 压栈
  Dep.target = target; // Dep.target就是当前正在 渲染 watcher,并压栈(为了恢复时使用);
}

export function popTarget() {
  targetStack.pop(); // 恢复到上一个状态
  Dep.target = targetStack[targetStack.length - 1]; // 始终指向最后的那个watcher
  // why? 当前vm的数据依赖收集也结束，对应的 Dep.target 也要改变，顺序就是 从子到父
}
