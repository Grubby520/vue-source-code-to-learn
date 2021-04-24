/**
 * 观察者
 */
export default class Watcher {
  id: number
  dirty: boolean
  cb: Function

  constructor(cb: Function) {
    this.cb = cb
  }

  get() { }

  addDep(dep) { }

  cleanupDeps() { }

  update() { }

  run() { }

  evaluate() { }

  depend() { }

  teardown() { }
}
