/* @flow */

import { ASSET_TYPES } from "shared/constants";
import { isPlainObject, validateComponentName } from "../util/index";

export function initAssetRegisters(Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   * * 定义 Vue.component、Vue.filter、Vue.directive 这三个方法
   * 这三个方法所做的事情是类似的，就是在 this.options.xx 上存放对应的配置
   * 比如 Vue.component(compName, {xx}) 结果是 this.options.components.compName = 组件构造函数
   * ASSET_TYPES = ['component', 'directive', 'filter']
   */
  ASSET_TYPES.forEach((type) => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + "s"][id];
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== "production" && type === "component") {
          validateComponentName(id);
        }
        if (type === "component" && isPlainObject(definition)) {
          definition.name = definition.name || id; // name的作用
          definition = this.options._base.extend(definition); // _base
        }
        if (type === "directive" && typeof definition === "function") {
          definition = { bind: definition, update: definition };
        }
        // 外部调用时，在实例化时通过 mergeOptions 将全局注册的组件合并到每个组件的配置对象的 components 中
        this.options[type + "s"][id] = definition;
        return definition;
      }
    };
  });
}
