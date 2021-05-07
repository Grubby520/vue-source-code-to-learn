/**
 * Remove an item from an array.
 */
export function remove(arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) { // 没有使用 !== ,而是使用的 > （书里也有提及）
      return arr.splice(index, 1)
    }
  }
}
