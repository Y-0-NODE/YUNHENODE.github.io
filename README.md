# YUNHENODE

个人内容、媒体与知识系统。当前架构保留原有公开页面和 CMS 路径，内部代码已按职责整理。

## 开发与检查

```bash
npm install
npm run check
npm run format:check
```

摄影文件夹同步：

```bash
npm run sync:gallery
```

## 目录

- `api/`：12 个稳定的 Vercel Serverless 入口。
- `assets/styles/`：公共样式与页面样式。
- `scripts/core/`：浏览器公共配置、工具和 API 客户端。
- `scripts/pages/`：页面控制器。
- `shared/`：前后端共用的内容模型和元数据解析。
- `lib/`：服务端仓库、服务和请求辅助代码。
- `database/migrations/`：Supabase 数据迁移。
- `legacy/`：不再运行但保留备查的旧代码。
- `docs/`：架构与迁移说明。

详细说明见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。
运维说明见 [`docs/OPERATIONS.md`](docs/OPERATIONS.md)。
重构结果见 [`docs/REFACTOR-REPORT.md`](docs/REFACTOR-REPORT.md)。
