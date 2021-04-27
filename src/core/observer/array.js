/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 * 增强Array.prototype上的7个方法
 */

import { def } from "../util/index";

const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto); // 创建对象，传入的是Array.prototype作为新建对象的原型对象

const methodsToPatch = [
  // 单独给这几个方法打补丁
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
];

/**
 * Intercept mutating methods and emit events
 * 拦截变异方法并触发事件
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method];
  // def 就是 Object.defineProperty，拦截 arrayMethods.method 的访问
  def(arrayMethods, method, function mutator(...args) {
    // util/lang.js
    const result = original.apply(this, args); // 1.执行原生方法
    const ob = this.__ob__;
    let inserted;
    switch (method) {
      case "push":
      case "unshift":
        inserted = args; // unshift添加进开头的新元素
        break;
      case "splice":
        inserted = args.slice(2); // splice添加进来的新元素
        break;
    }
    if (inserted) ob.observeArray(inserted); // 给新插入的元素做响应式处理
    // notify change 通知更新
    ob.dep.notify();
    return result;
  });
});
