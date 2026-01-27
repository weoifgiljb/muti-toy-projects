# 批量图片压缩

这是一个用于批量压缩图片的小工具集合，包含命令行压缩脚本和一个简单的 GUI 以及前端界面。

## 目录

- `compressor.py` / `gui.py`：批量图片压缩工具（Python）。
- `ui/`：前端界面，用于配合压缩工具做简单的可视化（基于 Vite + 前端框架）。
- `christmas-tree/`：节日示例前端项目（Vite + React/TSX），包含可交互的圣诞树效果。
- `face/`：人脸/摄像头演示小项目（前端），通常用于演示视觉效果或 WebRTC/Canvas 示例。

## 快速开始

1. 克隆或下载仓库后，进入仓库根目录：

```powershell
cd "C:\Users\Administrator\OneDrive\Desktop\批量图片压缩"
```

2. 使用 Python 脚本（示例）：

```powershell
````markdown
# muti-toy-projects — 小项目合集

本仓库收集了几个小型示例/工具项目，方便演示与实验：图片压缩工具（含 GUI）、前端演示（Vue / React / Three.js）等。

快速目录概览：

- `compressor.py`, `gui.py` — 批量图片压缩（Python）和桌面 GUI 启动脚本。
- `批量图片压缩/` — Windows 可执行版构建与使用说明（把文件夹拖到 EXE 上即可压缩）。
- `ui/` — Vue 前端界面（用于 GUI 的前端部分，基于 Vite）。
- `christmas-tree/` — 节日效果示例（Vite + React/TSX）。
- `face/` — "Aurora Face" 三维光晕人脸示例（Three.js + Vite/静态服务器）。

每个子项目简介与快速使用：

1) 批量图片压缩（根脚本与 EXE）

	 - 功能：批量压缩 JPG/PNG/WEBP，支持质量设定、PNG 量化、保留/移除 EXIF、dry-run 等选项。
	 - 脚本：在仓库根运行 `python compressor.py` 或 `python gui.py`（需 Python 环境）。
	 - 可执行：`批量图片压缩/` 目录下包含生成 EXE 的说明，使用 `build.ps1` 生成 `dist\BatchImageCompressor.exe`，拖拽文件夹到 EXE 即可。

2) GUI（`ui/`）

	 - 描述：基于 Vue 的前端，使用 `pywebview` 由 `gui.py` 托管为桌面界面。
	 - 本地开发：
		 ```powershell
		 cd ui
		 npm install
		 npm run dev
		 ```
	 - 打包与运行（桌面版）：
		 ```powershell
		 npm run build    # 在 ui/ 目录生成静态文件
		 pip install pywebview
		 python gui.py
		 .\build-gui.ps1  # 生成桌面可执行（可选）
		 ```

3) Christmas Tree (`christmas-tree/`)

	 - 描述：基于 Vite 的 React/TSX 小 demo，包含交互式圣诞树效果和装饰元素。
	 - 运行：
		 ```powershell
		 cd christmas-tree
		 npm install
		 npm run dev
		 ```

4) Aurora Face (`face/`)

	 - 描述：Three.js + 自定义着色器实现的 3D 发光人脸，包含情绪切换、光环颜色、参数控制等。
	 - 运行：
		 ```powershell
		 cd face
		 npm install
		 npm run dev   # 或使用 `npx vite` / `python -m http.server` 按需启动
		 ```

贡献与注意事项

- 我已添加常见忽略项到 `.gitignore`，避免将 `node_modules/` 提交到仓库。
- 仓库历史中若已误提交大量依赖或大文件，可使用 BFG 或 `git filter-repo` 清理历史（会改写历史并需强制推送）。若需要，我可以帮助执行并说明风险。

如何在本地运行（简短）

```powershell
git clone https://github.com/weoifgiljb/muti-toy-projects.git
cd muti-toy-projects
# 运行图片压缩脚本（需要 Python）
python compressor.py
# 运行 UI 前端
cd ui
npm install
npm run dev
```

如需我为某个子项目补充更完整的 README（例如参数详解、截图、示例命令、依赖版本、Windows 打包步骤等），请告诉我你想优先完善的项目，我会继续更新并推送更改。

````