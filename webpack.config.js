const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: './root/src/index.ts',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
   resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  devServer: {
    contentBase: './dist',
    hot: true,
    open: true,
    compress: true,
    port: 9000
  },
  watch: true,
  module: {
    rules: [
      { test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  performance: {
    hints: "warning",
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Star',
      template: 'index.html'
    })
  ]
}
