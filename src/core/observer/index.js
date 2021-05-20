/* @flow */

import Dep from "./dep";
import VNode from "../vdom/vnode";
import { arrayMethods } from "./array";
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering,
} from "../util/index";

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true;

export function toggleObserving(value: boolean) {
  shouldObserve = value;
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * Observer类是关联每个被观察的对象。一旦被观察过，那么observer就会把当前对象的property keys转变成
 * getter/setters函数，从而收集依赖和分发更新。
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value;
    this.dep = new Dep(); // dep实例
    this.vmCount = 0;
    def(value, "__ob__", this); // extra new key
    if (Array.isArray(value)) {
      /**
       * value 为数组
       * hasProto = '__proto__' in {}
       * 用于判断对象是否存在 __proto__ 属性，通过 obj.__proto__ 可以访问对象的原型链
       * 但由于 __proto__ 不是标准属性，所以有些浏览器不支持，比如 IE6-10，Opera10.1
       * 为什么要判断，是因为一会儿要通过 __proto__ 操作数据的原型链
       * 覆盖数组默认的七个原型方法，以实现数组响应式 (push,pop,shift,unshift,splice,sort,reverse)
       */
      if (hasProto) {
        protoAugment(value, arrayMethods); // 设置value的__proto__
      } else {
        // 现代浏览器都会走这
        copyAugment(value, arrayMethods, arrayKeys);
      }
      this.observeArray(value);
    } else {
      this.walk(value); // 给value对象的每个属性key（包括嵌套对象）设置响应式
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 只有对象才走这里，给所有property设置响应式（不管层级有多深）
   */
  walk(obj: Object) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i]);
    }
  }

  /**
   * Observe a list of Array items.
   * 数组走这里
   */
  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment(target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src; // 直接改浏览器的呀，
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 为对象创建观察者实例，如果对象已经被观察过，则返回已有的观察者实例，否则创建新的观察者实例
 */
export function observe(value: any, asRootData: ?boolean): Observer | void {
  // 非对象和 VNode 实例不做响应式处理
  if (!isObject(value) || value instanceof VNode) {
    return;
  }
  let ob: Observer | void;
  // 判断value对象是否已经attached, 因为set新增的属性值也会走这里
  if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value); // 创建观察者实例
  }
  if (asRootData && ob) {
    ob.vmCount++; // ? root data的编号?
  }
  return ob;
}

/**
 * Define a reactive property on an Object.
 * 拦截 obj[key] 的读取和设置操作：
 * 1、在第一次读取时收集依赖，比如执行 render 函数生成虚拟 DOM 时会有读取操作
 * 2、在更新时设置新值并通知依赖更新
 */
export function defineReactive(
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep(); // 一个key，一个Dep实例

  const property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    // 不可配置
    return;
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get;
  const setter = property && property.set;
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }

  let childOb = !shallow && observe(val); // ? wtf -> 调用Vue.set -> defineReactive，对新增的val值创建 .__ob__属性 (new Observer())
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    // 什么时候触发这个getter?
    get: function reactiveGetter() { // 收集依赖
      const value = getter ? getter.call(obj) : val; // 
      /**
       * Dep.target 为 Dep 类的一个静态属性，值为 watcher，在实例化 Watcher 时会被设置
       * 实例化 Watcher 时会执行 new Watcher 时传递的回调函数（computed 除外，因为它懒执行）
       * 而回调函数中如果有 vm.key 的读取行为，则会触发这里的 读取 拦截，进行依赖收集
       * 回调函数执行完以后又会将 Dep.target 设置为 null，避免这里重复收集依赖
       */
      if (Dep.target) {
        dep.depend(); // 收集依赖 Dep.target 已经被赋值成当前 渲染Watcher
        // ? childOb的作用 -> Vue.set 新增的val
        if (childOb) {
          childOb.dep.depend(); // this.key.childKey 能被触发响应式更新的原因
          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) { // 派发更新
      const value = getter ? getter.call(obj) : val; // 旧值
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        // 新值与旧值对比
        return;
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== "production" && customSetter) {
        customSetter();
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return;
      if (setter) {
        setter.call(obj, newVal); // 更新新值
      } else {
        val = newVal;
      }
      childOb = !shallow && observe(newVal); // 让新的值也是响应式
      console.log('dep.subs: ', dep.subs)
      dep.notify(); // 通知依赖更新
    },
  });
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * 添加不存在的属性，并进行响应式处理
 * 主干逻辑：
 * defineReactive()
 * ob.dep.notify()
 */
export function set(target: Array<any> | Object, key: any, val: any): any {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val); // 数组-splice 新增，这个splice会被拦截，已经不单纯是原生的那个splice
    return val;
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val; // 对象 - a[b] 新增
    return val;
  }
  const ob = (target: any).__ob__;
  // vmCount的作用：不能向vm实例或它的根$data动态添加响应式属性，而是在data里面提前声明好
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid adding reactive properties to a Vue instance or its root $data " +
          "at runtime - declare it upfront in the data option."
      );
    return val;
  }
  if (!ob) {
    // 没有__ob__属性，说明target不是响应式对象
    target[key] = val; // 则只添加，不做响应式处理
    return val;
  }
  defineReactive(ob.value, key, val); // 响应式处理-Object.defineProperty设置getter和setter，即为把新添加的属性变成响应式对象
  ob.dep.notify(); // 遍历watchers，触发watcher.update(),重新收集watcher依赖
  return val;
}

/**
 * Delete a property and trigger change if necessary.
 * 1.从数组或者对象中删除key对应的property
 * 2.通知更新， .__ob__.dep.notify()
 */
export function del(target: Array<any> | Object, key: any) {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1); // 数组，splice删除
    return;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    // 兼容判断，避免删除Vue instance or its root $data
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid deleting properties on a Vue instance or its root $data " +
          "- just set it to null."
      );
    return;
  }
  if (!hasOwn(target, key)) {
    // 兼容判断-属性不存在
    return;
  }
  delete target[key]; // 对象，delete删除
  if (!ob) {
    // 兼容判断-不是响应式数据，就不用notify
    return;
  }
  ob.dep.notify();
}

/**
 * defineProperty监听不到数组长度变化的，监听数组所有索引的成本太高
 * 数组是单独调用observeArray方法-数据描述符，不是defineReactive方法-存储描述符，
 * 使用defineProperty对Array的7个原型方法进行拦截，把被拦截的数据的原型指向改造后的原型（arrayMethods）
 * 并没有直接修改Array.prototype(隔离，不污染全局的Array)，而是把arrayMethods赋值给value的__proto__(现代浏览器都有实现),只对data中的属性有效
 *
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 * 拦截数组的元素不像属性getters函数那样，只能当数组touched时，去递归的收集依赖关系
 * qs: 怎么算是touched?
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i];
    e && e.__ob__ && e.__ob__.dep.depend(); // &&运算符，大佬也这样玩，没毛病
    if (Array.isArray(e)) {
      //
      dependArray(e); // 前面递归阶段无法为数组中的元素添加依赖，得递归遍历 depend() 收集依赖
    }
  }
}
