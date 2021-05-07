/* @flow */

import { toArray } from "../util/index";

export function initUse(Vue: GlobalAPI) {
  /**
   * 定义 Vue.use，负责为 Vue 安装插件，做了以下两件事：
   *   1、判断插件是否已经被安装，如果安装则直接结束
   *   2、安装插件，执行插件的 install 方法
   * @param {*} plugin install 方法 或者 包含 install 方法的对象
   * @returns Vue 实例
   */
  Vue.use = function (plugin: Function | Object) {
    // console.log(this);
    const installedPlugins =
      this._installedPlugins || (this._installedPlugins = []);
    if (installedPlugins.indexOf(plugin) > -1) {
      return this;
    }

    // additional parameters
    const args = toArray(arguments, 1);
    args.unshift(this);
    if (typeof plugin.install === "function") {
      plugin.install.apply(plugin, args); // apply
    } else if (typeof plugin === "function") {
      plugin.apply(null, args); // 不是对象，没有install属性，而是函数，apply
    }
    installedPlugins.push(plugin);
    // console.log(installedPlugins);
    return this;
  };
}
