import { initMixin } from './init'

function Vue(options: any) {
  this._init(options)
}

initMixin(Vue)

export default Vue
