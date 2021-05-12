/* @flow */

import { parse } from 'compiler/parser/index'
import { generate } from './codegen'
import { optimize } from './optimizer'
import { createCompilerCreator } from 'compiler/create-compiler'

/**
 * 同样，Vue.js 也是利用 函数柯里化 技巧把基础的编译过程函数抽出来，
 * 通过 createCompilerCreator(baseCompile) 的方式把真正编译的过程和其它逻辑如对编译配置处理、
 * 缓存处理等剥离开，这样的设计还是非常巧妙的.
 * 
 * 业务场景：相同逻辑封装到一个方法里，相同入参只进行一次运算，缓存执行结果，从而实现模块的高重用性；
 */
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)
  optimize(ast, options)
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
