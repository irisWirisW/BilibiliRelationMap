#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 获取命令行参数
const versionType = process.argv[2] || 'patch' // patch 或 minor

// 文件路径
const packageJsonPath = path.join(__dirname, '../package.json')
const metadataJsonPath = path.join(__dirname, '../src/metadata.json')

// 读取 package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

// 解析当前版本
const currentVersion = packageJson.version
const versionParts = currentVersion.split('.').map(Number)

if (versionParts.length !== 3) {
  console.error('❌ 版本号格式错误，应为 x.y.z 格式')
  process.exit(1)
}

let [major, minor, patch] = versionParts

// 根据类型递增版本号
if (versionType === 'minor') {
  // 递增 minor 版本，patch 重置为 0
  minor += 1
  patch = 0
} else if (versionType === 'patch') {
  // 递增 patch 版本
  patch += 1
} else {
  console.error('❌ 未知的版本类型，应为 patch 或 minor')
  process.exit(1)
}

const newVersion = `${major}.${minor}.${patch}`

// 更新 package.json
packageJson.version = newVersion
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8')

// 更新 metadata.json
const metadataJson = JSON.parse(fs.readFileSync(metadataJsonPath, 'utf-8'))
metadataJson.version = newVersion
fs.writeFileSync(metadataJsonPath, JSON.stringify(metadataJson, null, 4) + '\n', 'utf-8')

console.log(`✅ 版本号已更新: ${currentVersion} → ${newVersion}`)
console.log(`   类型: ${versionType}`)
console.log(`   已更新文件:`)
console.log(`   - package.json`)
console.log(`   - src/metadata.json`)
