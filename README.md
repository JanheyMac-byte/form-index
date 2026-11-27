# 脑海 MIND ATLAS · 设计灵感库

以白瓷脑部雕塑和网站星环为入口的设计灵感导航。可以按分类浏览、搜索、收藏和添加网站。收藏、自定义网站及偏好保存在当前浏览器。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 8000 --directory docs
```

在浏览器中打开 http://localhost:8000/ 。

## 更新网站

页面、样式、资源目录和发布文件位于 `docs/`。WebGL 雕塑、水波及植物互动的源码位于 `sculpture/`。修改这部分源码后，在仓库根目录重新构建：

```sh
npm ci
npm run build
```

## GitHub Pages

发布源选择 `main` 分支的 `/docs` 目录。

## 私人灵感存档

完整版使用 Python 3.10 或以上版本。请在仓库根目录运行以下命令，然后打开 <http://127.0.0.1:8746/archive.html>。

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r archive/requirements.txt
.venv/bin/python archive/server.py
```

本机预览可以用邮箱、自拟用户名和密码注册，密码至少 10 个字符。普通账号可以存入、查看和移除自己的内容。网页以标题和原始链接存档。照片、视频原件与 SQLite 数据库保存在静态目录外的 `.archive-data/local/` 中。单文件上限为 100 MB，每个账号可存 1,000 份、共 2 GB。

在服务器终端运行以下命令设置唯一的开发者账号。按提示输入自己的邮箱和密码。已有账号需输入原密码。开发者登录后，可以在账号选择器中只读查看其他用户的存档。

```sh
.venv/bin/python archive/server.py developer
```

### 供其他人注册

将完整仓库和 Python 服务部署到有持久磁盘的服务器。配置 HTTPS 反向代理，将整个域名的请求转给本机的 Waitress 端口，并保留原始 Host。代理的上传大小上限需要容纳 100 MB 文件和表单开销。让服务由系统进程管理器启动，并备份整个私有数据目录。GitHub Pages 可以继续托管公开资源库，导航中的存档链接可指向这个 HTTPS 服务。

公网服务启动前设置以下环境变量。运行开发者设置命令时使用同一套环境变量。

| 变量 | 用途 |
| --- | --- |
| `ARCHIVE_PUBLIC_URL` | 公开的 HTTPS 根地址，例如 `https://archive.example.com` |
| `ARCHIVE_DATA` | 可选的持久数据目录。默认使用 `.archive-data/live/`，与本机预览分开 |

本机和公网均使用邮箱、自拟用户名和密码直接注册，注册成功即进入自己的存档。此后使用邮箱和密码登录。修改用户名后，存档仍关联原账号 ID。文件请求（含视频分段播放）与列表读取执行相同的账号权限检查。密码使用带盐的 scrypt 哈希，注销会撤销服务端会话。

运行 `.venv/bin/python archive/test_access.py` 可在独立临时数据库中检查直接注册、账号隔离、文件访问、开发者权限和会话撤销。
