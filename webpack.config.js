const path = require('path');
const outputPath = path.resolve(__dirname, 'dist');

module.exports = {
  mode: 'production',
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
        exclude: /samples/,
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
        exclude: /samples/,
        use: 'ts-loader'
      },
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        exclude: [
          /node_modules/,
          /samples/
        ],
        use: [
          'raw-loader'
        ]
      },
      {
        test: /\.obj$/,
        use: [
          'raw-loader'
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },

  devServer: {
    contentBase: outputPath,
    port: 9000
  }
}