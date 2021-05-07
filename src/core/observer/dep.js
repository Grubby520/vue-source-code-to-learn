/* @flow */
// 2
import type Watcher from "./watcher";
import { remove } from "../util/index";
import config from "../config";

let uid = 0; // 每个dep都有一个uid

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 观察者模式
 * 收集依赖，一个dep实例依赖的watcher有哪些
 * 数据更新时，依次通知dep中的watcher去执行update方法
 *
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor() {
    this.id = uid++;
    this.subs = [];
  }

  addSub(sub: Watcher) {
    this.subs.push(sub);
  }

  removeSub(sub: Watcher) {
    remove(this.subs, sub);
  }

  // ? watcher中添加dep
  depend() {
    // console.log(Dep.target);
    if (Dep.target) {
      Dep.target.addDep(this);
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
  targetStack.push(target); // 收集依赖
  Dep.target = target; // Dep.target就是当前正在执行的watcher;
}

export function popTarget() {
  targetStack.pop(); // pop一个值
  Dep.target = targetStack[targetStack.length - 1]; // 始终指向最后的那个watcher
}
