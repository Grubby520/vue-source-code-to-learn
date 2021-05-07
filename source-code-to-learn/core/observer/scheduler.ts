import type Watcher from './watcher'
import { nextTick } from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
let has: { [key: number]: boolean } = {}
let waiting = false // ? 当前队列是否已经清空 ?
let flushing = false // 是否正在刷新队列
let index = 0 // 队列中正在执行的watcher的下标

export function queueWatcher(watcher: Watcher) {
  const id = watcher.id
  if (!has[id]) {
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }

    if (!waiting) {
      waiting = true
      // 将回调函数flushSchedulerQueue放入callbacks数组
      // 通过pending: boolean控制向浏览器任务队列(Promise-微任务)中添加flushCallbacks
      nextTick(flushSchedulerQueue); // next-tick.js
    }
  }
}

function flushSchedulerQueue() {

}