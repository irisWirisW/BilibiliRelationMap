const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const metadata = require('./src/metadata.json');

const getBanner = (meta) => {
  const lines = Object.entries(meta).map(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map(v => `// @${key.padEnd(16)}${v}`).join('\n');
    }
    return `// @${key.padEnd(16)}${value}`;
  });

  return `// ==UserScript==\n${lines.join('\n')}\n// ==/UserScript==`;
};

module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    filename: 'script.user.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: false,
            compilerOptions: {
              noEmit: false
            }
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true
              }
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: getBanner(metadata),
      raw: true,
      entryOnly: true
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          output: {
            comments: /==\/?UserScript==|^[ ]?@/i
          }
        },
        extractComments: false
      })
    ]
  }
};
