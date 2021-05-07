/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index' // 不同平台

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// 入参对象 装了一堆方法，按不同的用途拆分在不同的模块里
// nodeOps '平台dom'的一些操作方法
// modules 平台的一些模块
const params = { nodeOps, modules }
console.log(params)
/**
 * 函数柯里化的技巧和应用场景：
 * 在web和weex环境下，把虚拟dom映射到‘平台dom’的方法是不同的，把代码分散到各个目录的
 * 而不同平台 patch 的主要逻辑部分是相同的，放在core下。
 * 差异化部分只需要通过参数来区分。
 */
export const patch: Function = createPatchFunction(params)
