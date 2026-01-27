# 批量图片压缩 EXE

把文件夹拖到程序上即可批量压缩图片，输出到同级的新文件夹中。

## 功能
- 支持 JPG/JPEG/PNG/WEBP
- 输出到源文件夹同级的 `*_compressed` 目录
- JPEG/WebP 可设置质量参数
- PNG 支持无损优化或可选有损量化

## 使用方式

拖拽方式：
1. 先用 `build.ps1` 生成 `dist/BatchImageCompressor.exe`
2. 把文件夹直接拖到 `BatchImageCompressor.exe` 上

命令行方式：
```powershell
dist\BatchImageCompressor.exe "C:\Images" --quality 75
```

## 参数说明
- `--quality 1-95`：JPEG/WebP 质量（默认 75），也会用于 PNG 颜色数量映射
- `--png-lossy`：启用 PNG 有损压缩（量化颜色）
- `--png-colors 2-256`：指定 PNG 颜色数量（优先于 `--quality` 映射）
- `--keep-metadata`：保留 EXIF 元数据（默认会移除以减少体积）
- `--copy-others`：把非支持文件也复制到输出目录
- `--dry-run`：只演示，不写入
- `--pause`：结束后暂停以便查看输出

## 生成 EXE
```powershell
.\build.ps1
```

生成后在 `dist\BatchImageCompressor.exe`。
