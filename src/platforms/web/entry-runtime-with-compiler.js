/* @flow */

import config from "core/config";
import { warn, cached } from "core/util/index";
import { mark, measure } from "core/util/perf";
// Level 1
console.info('Level 1')
import Vue from "./runtime/index"; // 来源
import { query } from "./util/index";
import { compileToFunctions } from "./compiler/index";
import {
  shouldDecodeNewlines,
  shouldDecodeNewlinesForHref,
} from "./util/compat";

const idToTemplate = cached((id) => { // 没看懂cached的意义
  const el = query(id);
  return el && el.innerHTML;
});

console.info(' --重写 Vue.prototype.$mount 根据不同平台 web/weex')
const mount = Vue.prototype.$mount; // 缓存 public method
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  console.log(el)
  el = el && query(el); // 字符串转成DOM对象

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== "production" &&
      warn(
        `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
      );
    return this;
  }
  // 取值的优先级 render、 template、 el （只取其一，后面的会被忽略）
  const options = this.$options;
  // resolve template/el and convert to render function
  if (!options.render) {
    let template = options.template;
    // Compile template into render function 模板编译成render函数
    if (template) {
      if (typeof template === "string") {
        if (template.charAt(0) === "#") {
          // 如果值以 # 开始，则它将被用作选择符，并使用匹配元素的 innerHTML 作为模板(<script type="x-template">)
          template = idToTemplate(template);
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== "production" && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            );
          }
        }
      } else if (template.nodeType) {
        // DOM对象
        template = template.innerHTML;
      } else {
        if (process.env.NODE_ENV !== "production") {
          warn("invalid template option:" + template, this);
        }
        return this;
      }
    } else if (el) {
      // Compile el's outerHTML as template
      template = getOuterHTML(el);
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== "production" && config.performance && mark) {
        mark("compile");
      }
      // 入口 compileToFunctions
      /**
       * compileToFunctions()
       * createCompileToFunctionFn() @returns compileToFunctions -> compile()
       *   <- createCompilerCreator() @returns createCompiler() @returns compile
       *     -> baseCompile() -> 
       *        1. parse() 模板字符串生成ast, 
       *        2. optimize() 优化语法树 [ markStatic, markStaticRoots ], 
       *        3. generate() @returns {render, staticRenderFns }
       */
      const { render, staticRenderFns } = compileToFunctions(
        template,
        {
          outputSourceRange: process.env.NODE_ENV !== "production",
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments,
        },
        this
      );
      options.render = render; // 最终转成render方法
      options.staticRenderFns = staticRenderFns;

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== "production" && config.performance && mark) {
        mark("compile end");
        measure(`vue ${this._name} compile`, "compile", "compile end");
      }
    }
  }
  return mount.call(this, el, hydrating); // 最终，调用原先原型上的 $mount 挂载
};

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML(el: Element): string {
  if (el.outerHTML) {
    console.log(el.outerHTML)
    return el.outerHTML;
  } else {
    const container = document.createElement("div");
    container.appendChild(el.cloneNode(true));
    return container.innerHTML;
  }
}

// key point
console.info(' --添加 Vue.compile')
Vue.compile = compileToFunctions;

console.info(' --初始化 Vue 结束')
export default Vue; // 最终的Vue

