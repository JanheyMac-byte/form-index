# 形迹 · 设计灵感库

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
