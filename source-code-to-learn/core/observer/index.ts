import { observe } from "../../../src/core/observer";
import Dep from "../../../src/core/observer/dep";

/**
 * 响应式数据的核心
 * Define a reactive property on an Object
 * @param obj 对象
 * @param key 属性
 * @param val
 * @param customSetter
 * @param shallow
 */
export function defineReactive(
  obj: object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // const dep = new Dep()
  // 返回对象上一个自有属性对应的属性描述符（对象上直接赋值的，不需要从原型链上查找的属性）
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    // 不可修改或删除
    return
  }
  // 是否有预定义getter和setter
  const getter = property && property.get
  const setter = property && property.get
  if ((!getter || setter) && arguments.length === 2) {
    // 初始化基本走这儿
    val = obj[key]
  }
  // let childOb = !shallow && observe(val)

  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val
      return value
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val // 旧值
      if (newVal === value) {
        return
      }
      if (getter && !setter) {
        return // 只有getter，说明是常量，不用响应式
      }
      if (setter) {
        setter.call(obj, newVal) // 有setter，调用setter更新值
      } else {
        val = newVal
      }
      // dep.notify()
    }
  })
}
