/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// 可选择: parser, optimizer, codegen
// baseCompile 的定义
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options) // 模板字符串生成AST
  if (options.optimize !== false) {
    optimize(ast, options) // 优化语法树
  }
  const code = generate(ast, options) // render, staticRenderFns
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
