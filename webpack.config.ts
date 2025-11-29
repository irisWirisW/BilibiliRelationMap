import * as path from 'path'
import { fileURLToPath } from 'url'
import webpack, { Configuration } from 'webpack'
import metadata from './src/metadata.json'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getBanner = (meta: Record<string, string | string[]>): string => {
  const lines = Object.entries(meta).map(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map(v => `// @${key.padEnd(16)}${v}`).join('\n')
    }
    return `// @${key.padEnd(16)}${value}`
  })

  return `// ==UserScript==\n${lines.join('\n')}\n// ==/UserScript==`
}

const config: Configuration = {
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
        use: 'ts-loader',
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
    minimize: true
  }
}

export default config
