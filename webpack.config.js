const path = require('path');
const outputPath = path.resolve(__dirname, 'dist');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: './src/index.ts',
  output: {
    path: outputPath,
    filename: 'main.js'
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.ts$/,
        use: [
          {
            loader: 'tslint-loader',
            options: {
              typeCheck: true,
              fix: true
            }
          }
        ]
      },
      {
        test: /\.ts$/,
        use: 'ts-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },

  devServer: {
    contentBase: outputPath
  }
}