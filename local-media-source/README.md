把要发布到网站的摄影照片放在这个文件夹。

这个方式不走 Supabase Storage，所以不会遇到 Supabase 免费版 50MB 单文件上传限制。
它适合摄影作品、网站展示图和中等大小视频。

运行同步后，系统会把图片压缩成网站展示图，输出到：

assets/local-gallery/

并生成：

data/local-gallery.json

每张图片会生成两份：

- 缩略图：列表页面使用，打开快。
- 高清图：点开作品详情时使用，最长边 4096px。

如果想给图片写标题和说明，可以在图片旁边放同名 txt 文件。

例：

IMG_001.jpeg
IMG_001.txt

txt 内容：

标题：城市夜色
说明：一次夜间观察记录。

视频文件不建议直接放很大的 4K 原片。超过 50MB 的视频会被跳过。

运行方式：

node scripts/sync-local-gallery.js local-media-source

运行后，把生成的 assets/local-gallery 和 data/local-gallery.json 一起提交到 GitHub，Vercel 重新部署后，网站就能看到。
