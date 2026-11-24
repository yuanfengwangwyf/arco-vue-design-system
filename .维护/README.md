# Arco Vue 本地文档

基于 Arco Design Vue 2.59.0，固定上游提交 `d9f1b3747988f1d510c31380e6b2bc1a5f6bdca3`。根路由进入更新日志。中文文档、组件示例和对应版本的变更记录随项目保存。

## 启动

直接查看时，在文件管理器双击 `offline/index.html`。整个 `offline/` 目录可以复制到其他电脑，通过 `file://` 打开。离线版的菜单、文档、本地字体图片及本地交互 Demo 无需启动服务；访问远程数据和上传接口的示例仍需网络。

修改源文件后，用 `npm run build:offline` 刷新离线目录。浏览器关闭网络后可用 `npm run test:offline` 对离线版执行自动验证。

需要 Node.js 22 和 npm。常规使用只需要 npm 安装依赖。

```powershell
npm ci
npm run dev
```

打开 Vite 输出的本地地址。生产构建使用 `npm run build`，本地查看构建产物使用 `npm run preview`。构建产物位于 `dist/`；使用其他静态服务器时，将文档路径交由 SPA 的 `index.html` 处理。

## 目录

| 路径 | 内容 |
| --- | --- |
| `basic/` | 每组件一个 HTML 文件，内含说明、API 和全部可运行的 Demo |
| `basic-components/` | 每组件一个可导入的 JavaScript 入口 |
| `src/components/basic/` | 每组件独立的 CSS 文件 |
| `design-variable.css`、`src/tokens/` | 设计变量入口、按用途拆分的 CSS 变量与明暗主题 |
| `styles.css`、`src/styles/` | 普通样式入口、全局样式和上游基础样式 |
| `demo/app/` | 分开的 HTML 界面文件与 JavaScript 交互文件 |
| `page/` | 中文指南、组件总览和更新日志，页面各自独立 |
| `demo/styles/` | 文档布局和独立 Demo CSS |
| `public/fonts/`、`public/images/` | 本地字体与示例图片 |
| `manifests/` | 页面、Demo、源码和 Token 关联数据 |
| `reports/` | 导入与浏览器验收记录 |

运行时复用同版本 npm 包的组件。清单里的 `entry` 指向本地 JavaScript 入口，`source` 链接到固定提交的官方源码。以 `demos` 关联示例，使用 `component` 在 `token-map.json` 的 `references` 查询组件 CSS 中的变量，再用 `definitions` 查变量声明位置。

编辑 `basic/<组件>.html` 可同时调整说明和运行示例。每个示例的 HTML 和 JavaScript 放在 `<template data-demo-source>` 中。Vite 在启动与构建时生成运行缓存 `generated/`。组件入口、字体、图片和样式有各自的维护文件。仍使用远程图片、上传或数据服务的示例取决于相应服务。

## 校验与刷新

```powershell
npm run check
npm run build
npx playwright install chromium
npm test
```

也可设置 `$env:ARCO_BROWSER_CHANNEL = 'msedge'` 后复用本机 Edge。日常修改 HTML、JS 或 CSS 后运行 `npm run dev` 检查即可。`npm run snapshot` 用于重新导入上游，会重新生成组件文档和入口文件，需要 Python 3 和 Git。

上游许可见 `LICENSE.arco`。


