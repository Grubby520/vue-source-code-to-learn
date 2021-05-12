/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

/**
 * 编译入口逻辑之所以这么绕，
 * 是因为 Vue.js 在不同的平台下都会有编译的过程，
 * 因此编译过程中的依赖的配置 baseOptions 会有所不同。
 * 而编译过程会多次执行，但这同一个平台下每一次的编译过程配置又是相同的，
 * 为了不让这些配置在每次编译过程都通过参数传入，
 * Vue.js 利用了函数柯里化的技巧很好的实现了 baseOptions 的参数保留
 * 
 * compile已经把baseOptions处理之后的结果缓存下来了
 * 
 */
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
