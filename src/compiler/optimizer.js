/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * 
 * 为什么要有优化过程，因为我们知道 Vue 是数据驱动，是响应式的，
 * 但是我们的模板并不是所有数据都是响应式的，也有很多数据是首次渲染后就永远不会变化的，
 * 那么这部分数据生成的 DOM 也不会变化，我们可以在 patch 的过程跳过对他们的比对.
 * 
 * 那么至此我们分析完了 optimize 的过程，就是深度遍历这个 AST 树，
 * 去检测它的每一颗子树是不是静态节点，如果是静态节点则它们生成 DOM 永远不需要改变，
 * 这对运行时对模板的更新起到极大的优化作用。
   我们通过 optimize 我们把整个 AST 树中的每一个 AST 元素节点标记了 static 和 staticRoot，
   它会影响我们接下来执行代码生成的过程
 * 
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes. 标记静态节点
  markStatic(root)
  // second pass: mark static roots. 标记静态根ast
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

function markStatic (node: ASTNode) {
  node.static = isStatic(node)
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) {
        node.static = false
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

/**
 * markStaticRoots 第二个参数是 isInFor，对于已经是 static 的节点或者是 v-once 指令的节点，node.staticInFor = isInFor。 接着就是对于 staticRoot 的判断逻辑，从注释中我们可以看到，对于有资格成为 staticRoot 的节点，除了本身是一个静态节点外，必须满足拥有 children，并且 children 不能只是一个文本节点，不然的话把它标记成静态根节点的收益就很小了。

接下来和标记静态节点的逻辑一样，遍历 children 以及 ifConditions，递归执行 markStaticRoots
 * @param {*} node 
 * @param {*} isInFor 
 * @returns 
 */
function markStaticRoots (node: ASTNode, isInFor: boolean) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

/**
 * 
 */
function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // expression 表达式
    return false
  }
  if (node.type === 3) { // text 纯文本
    return true
  }
  /**
   * v-pre 不需要表达式 跳过这个元素和其子元素的编译过程 (静态)
   * v-if 
   * v-for
   * tag
   */
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in
    isPlatformReservedTag(node.tag) && // not a component 非内置组件
    !isDirectChildOfTemplateFor(node) && // 带有 v-for 的 template 标签的直接子节点
    Object.keys(node).every(isStaticKey) // 节点的所有key都是静态的key
  ))
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
