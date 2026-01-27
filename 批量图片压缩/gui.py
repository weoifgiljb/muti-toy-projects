import json
import threading
from pathlib import Path

import webview

from compressor import (
    compress_folder,
    normalize_quality,
    pick_folder_via_dialog,
)


class AppApi:
    def __init__(self) -> None:
        self.window: webview.Window | None = None
        self.is_running = False

    def select_folder(self) -> str:
        folder = pick_folder_via_dialog()
        if folder is None:
            return ""
        return str(folder)

    def start_compression(self, options: dict) -> dict:
        if self.is_running:
            return {"ok": False, "message": "Compression already running."}
        folder = options.get("folder") if isinstance(options, dict) else ""
        if not folder:
            return {"ok": False, "message": "Folder is required."}
        thread = threading.Thread(
            target=self._run_compression,
            args=(options,),
            daemon=True,
        )
        thread.start()
        return {"ok": True}

    def _emit_log(self, message: str) -> None:
        if self.window is None:
            return
        payload = json.dumps(message)
        self.window.evaluate_js(f"window.__addLog({payload})")

    def _emit_status(self, status: str) -> None:
        if self.window is None:
            return
        payload = json.dumps(status)
        self.window.evaluate_js(f"window.__setStatus({payload})")

    def _run_compression(self, options: dict) -> None:
        self.is_running = True
        try:
            folder = Path(options.get("folder", ""))
            if not folder.exists() or not folder.is_dir():
                self._emit_status("error")
                self._emit_log("[ERROR] Folder not found.")
                return

            quality = normalize_quality(int(options.get("quality", 75)))
            png_lossy = bool(options.get("pngLossy"))
            png_colors = int(options.get("pngColors") or 0)
            keep_metadata = bool(options.get("keepMetadata"))
            copy_others = bool(options.get("copyOthers"))
            dry_run = bool(options.get("dryRun"))

            self._emit_status("running")
            output_dir, summary = compress_folder(
                folder,
                quality,
                png_lossy,
                png_colors,
                keep_metadata,
                copy_others,
                dry_run,
                log_callback=self._emit_log,
            )
            self._emit_log(f"Output: {output_dir}")
            self._emit_log(
                "Summary: "
                f"Total={summary['total']} "
                f"Success={summary['success']} "
                f"Failed={summary['failed']} "
                f"Skipped={summary['skipped']}"
            )
            self._emit_status("done")
        except Exception as exc:
            self._emit_status("error")
            self._emit_log(f"[ERROR] {exc}")
        finally:
            self.is_running = False


def resolve_ui_index() -> Path | None:
    root = Path(__file__).resolve().parent
    candidate = root / "ui" / "dist" / "index.html"
    if candidate.exists():
        return candidate
    return None


def main() -> None:
    api = AppApi()
    index_path = resolve_ui_index()
    if index_path is None:
        html = """
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>UI Build Required</title>
            <style>
              body { font-family: Arial, sans-serif; background: #0b0f14; color: #f7f4e9; padding: 48px; }
              code, pre { background: #11171e; padding: 12px; border-radius: 8px; display: block; }
              h1 { font-size: 24px; }
            </style>
          </head>
          <body>
            <h1>UI build required</h1>
            <p>Build the Vue UI first, then re-run this app.</p>
            <pre>cd ui
npm install
npm run build</pre>
          </body>
        </html>
        """
        window = webview.create_window(
            "Batch Image Compressor",
            html=html,
            width=900,
            height=520,
            min_size=(720, 420),
            js_api=api,
        )
    else:
        window = webview.create_window(
            "Batch Image Compressor",
            index_path.as_uri(),
            width=1200,
            height=760,
            min_size=(980, 640),
            js_api=api,
        )
    api.window = window
    webview.start(debug=True)


if __name__ == "__main__":
    main()
