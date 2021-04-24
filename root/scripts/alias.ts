// node环境
const path = require("path")

const resolve = (p) => path.resolve(__dirname, "../", p)

module.exports = {
  shared: resolve("src/shared")
}
