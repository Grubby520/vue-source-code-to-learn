### Runtime Only VS Runtime + Compiler
* Runtime Only
生产环境推荐使用，仅运行时，体积更小

* Runtime + Compiler
自带 compiler 的vue版本 （抛开 webpack 的 vue-loader）

入口位置
platforms/web/entry-runtime-with-compiler.js
runtime/index.js
core/index.js
instance/index.js

* initGlobalAPI(Vue) 

### 模板和数据如何渲染成最终的DOM
$ state.js
  _init(options)
  vm.$mount(vm.$options.el) // 挂载过程

$ entry-runtime-with-compiler.js
  Vue.compile -> compileToFunctions

$mount有一个公共的方法，然后根据环境，对应一个重写方法；


