# 收藏夹管理器 (Bookmarks Manager)

一个基于 Express + JSON 文件存储的书签管理应用，支持分类管理、批量操作、图标自定义等功能。

## 功能特性

- ✅ 用户认证系统（注册/登录/修改密码）
- ✅ 分类管理（添加/编辑/删除分类，支持 Emoji 图标和颜色）
- ✅ 书签管理（添加/编辑/删除/排序）
- ✅ 批量操作（批量删除、批量修改图标、批量设置分类）
- ✅ 图标功能（自动获取 favicon、上传自定义图片、选择 Emoji）
- ✅ 搜索功能
- ✅ 导入/导出（支持 JSON 和 HTML 格式）
- ✅ 响应式设计（支持移动端）
- ✅ 数据自动备份

## 部署方式

### 方式一：直接运行

```bash
cd backend
npm install
node server.js
```

访问 http://localhost:8010

### 方式二：Docker Compose

```bash
docker-compose up -d
```

### 方式三：SSH 一键拉取安装

```bash
ssh root@your-server -p 22 "cd /opt && git clone https://github.com/hddmatt/BookMarks.git && cd BookMarks/backend && npm install && bash start.sh"
```

或已克隆后更新：

```bash
ssh root@your-server -p 22 "cd /opt/BookMarks && git pull && cd backend && npm install && bash start.sh"
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 8010 | 服务端口 |
| HOST | 0.0.0.0 | 服务地址 |

## 初始账号

- 用户名：`admin`
- 密码：`admin`

首次登录后请修改密码。

## 技术栈

- 前端：原生 HTML/CSS/JavaScript
- 后端：Express.js
- 数据存储：JSON 文件

## 目录结构

```
bookmarks-app/
├── public/
│   └── index.html          # 前端页面
├── backend/
│   ├── server.js           # 后端服务
│   ├── index.html          # 备用前端页面
│   ├── bookmarks.json      # 数据文件
│   ├── package.json        # 依赖配置
│   └── Dockerfile          # Docker 配置
├── docker-compose.yml      # Docker Compose 配置
├── start.sh                # 启动脚本
└── .gitignore              # Git 忽略配置
```