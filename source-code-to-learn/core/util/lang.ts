export const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

/**
 * Parse simple path.
 * example: watch vm.e.f's value ('e.f')
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);
export function parsePath(path: string): any {
  if (bailRE.test(path)) {
    return;
  }
  const segments = path.split(".");
  return function (obj) {
    // 闭包，函数返回一个函数，保持了对父级作用域中segments的引用
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return;
      obj = obj[segments[i]]; // 逐级取到最后的值
    }
    return obj;
  };
}
