import argparse
import shutil
import time
from pathlib import Path
from typing import Callable, Dict, Iterable, Tuple

from PIL import Image, ImageOps


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch compress images from a folder into a new sibling folder.",
    )
    parser.add_argument(
        "folders",
        nargs="*",
        help="Folder paths. You can drag folders onto the EXE to pass them here.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=75,
        help="Quality for JPEG/WebP (1-95 recommended). Also used to map PNG colors.",
    )
    parser.add_argument(
        "--png-lossy",
        action="store_true",
        help="Use lossy PNG compression via color quantization.",
    )
    parser.add_argument(
        "--png-colors",
        type=int,
        default=0,
        help="Explicit PNG palette size (2-256). Overrides --quality mapping.",
    )
    parser.add_argument(
        "--keep-metadata",
        action="store_true",
        help="Keep EXIF metadata (default strips metadata).",
    )
    parser.add_argument(
        "--copy-others",
        action="store_true",
        help="Copy non-supported files into the output folder.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print what would happen without writing files.",
    )
    parser.add_argument(
        "--pause",
        action="store_true",
        help="Pause on exit so the console stays open.",
    )
    return parser.parse_args()


def clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def normalize_quality(value: int) -> int:
    return clamp(value, 1, 95)


def get_output_dir(source_dir: Path) -> Path:
    base = source_dir.resolve()
    candidate = Path(f"{base}_compressed")
    if not candidate.exists():
        return candidate
    for index in range(1, 1000):
        candidate = Path(f"{base}_compressed_{index}")
        if not candidate.exists():
            return candidate
    raise RuntimeError("Failed to create a unique output directory name.")


def iter_files(folder: Path) -> Iterable[Path]:
    for path in folder.rglob("*"):
        if path.is_file():
            yield path


def map_png_colors(quality: int) -> int:
    # Higher quality -> more colors (less loss).
    quality = clamp(quality, 1, 100)
    return int(2 + (quality / 100.0) * 254)


def compress_jpeg(
    image: Image.Image,
    output_path: Path,
    quality: int,
    keep_metadata: bool,
    dry_run: bool,
) -> None:
    save_kwargs = {
        "format": "JPEG",
        "quality": quality,
        "optimize": True,
        "progressive": True,
    }
    if keep_metadata and "exif" in image.info:
        save_kwargs["exif"] = image.info["exif"]
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")
    if dry_run:
        return
    image.save(output_path, **save_kwargs)


def compress_png(
    image: Image.Image,
    output_path: Path,
    quality: int,
    lossy: bool,
    colors_override: int,
    dry_run: bool,
) -> None:
    if lossy:
        colors = colors_override or map_png_colors(quality)
        colors = clamp(colors, 2, 256)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        if image.mode == "RGBA":
            image = image.quantize(
                colors=colors,
                method=Image.FASTOCTREE,
                dither=Image.FLOYDSTEINBERG,
            )
        else:
            image = image.quantize(
                colors=colors,
                method=Image.MEDIANCUT,
                dither=Image.FLOYDSTEINBERG,
            )
    save_kwargs = {
        "format": "PNG",
        "optimize": True,
        "compress_level": 9,
    }
    if dry_run:
        return
    image.save(output_path, **save_kwargs)


def compress_webp(
    image: Image.Image,
    output_path: Path,
    quality: int,
    dry_run: bool,
) -> None:
    save_kwargs = {
        "format": "WEBP",
        "quality": clamp(quality, 1, 100),
        "method": 6,
    }
    if dry_run:
        return
    image.save(output_path, **save_kwargs)


def compress_image(
    source_path: Path,
    output_path: Path,
    quality: int,
    png_lossy: bool,
    png_colors: int,
    keep_metadata: bool,
    dry_run: bool,
) -> Tuple[bool, str]:
    try:
        with Image.open(source_path) as image:
            image = ImageOps.exif_transpose(image)
            suffix = source_path.suffix.lower()
            if suffix in (".jpg", ".jpeg"):
                compress_jpeg(image, output_path, quality, keep_metadata, dry_run)
            elif suffix == ".png":
                compress_png(image, output_path, quality, png_lossy, png_colors, dry_run)
            elif suffix == ".webp":
                compress_webp(image, output_path, quality, dry_run)
            else:
                return False, "Unsupported file extension."
    except Exception as exc:
        return False, str(exc)
    return True, ""


def ensure_parent(path: Path, dry_run: bool) -> None:
    if dry_run:
        return
    path.parent.mkdir(parents=True, exist_ok=True)


def compress_folder(
    folder: Path,
    quality: int,
    png_lossy: bool,
    png_colors: int,
    keep_metadata: bool,
    copy_others: bool,
    dry_run: bool,
    log_callback: Callable[[str], None] | None = None,
) -> Tuple[Path, Dict[str, int]]:
    output_dir = get_output_dir(folder)
    start_time = time.time()
    total = 0
    success = 0
    failed = 0
    skipped = 0
    log = log_callback or print

    log(f"Source: {folder}")
    log(f"Output: {output_dir}")

    for file_path in iter_files(folder):
        rel_path = file_path.relative_to(folder)
        dest_path = output_dir / rel_path
        ext = file_path.suffix.lower()
        if ext in SUPPORTED_EXTENSIONS:
            total += 1
            ensure_parent(dest_path, dry_run)
            ok, error = compress_image(
                file_path,
                dest_path,
                quality,
                png_lossy,
                png_colors,
                keep_metadata,
                dry_run,
            )
            if ok:
                success += 1
                log(f"[OK] {rel_path}")
            else:
                failed += 1
                log(f"[FAIL] {rel_path} -> {error}")
        else:
            skipped += 1
            if copy_others:
                ensure_parent(dest_path, dry_run)
                if not dry_run:
                    shutil.copy2(file_path, dest_path)
                log(f"[COPY] {rel_path}")
            else:
                log(f"[SKIP] {rel_path}")

    elapsed = time.time() - start_time
    log(
        "Done. "
        f"Total: {total}, Success: {success}, Failed: {failed}, "
        f"Skipped: {skipped}, Time: {elapsed:.1f}s"
    )
    return output_dir, {
        "total": total,
        "success": success,
        "failed": failed,
        "skipped": skipped,
    }


def pick_folder_via_dialog() -> Path | None:
    try:
        import tkinter  # noqa: PLC0415
        from tkinter import filedialog  # noqa: PLC0415
    except Exception:
        return None

    root = tkinter.Tk()
    root.withdraw()
    root.wm_attributes("-topmost", True)
    folder = filedialog.askdirectory(title="Select a folder to compress")
    root.destroy()
    if not folder:
        return None
    return Path(folder)


def main() -> None:
    args = parse_args()
    quality = normalize_quality(args.quality)

    folders = [Path(folder) for folder in args.folders]
    if not folders:
        picked = pick_folder_via_dialog()
        if picked is None:
            print("No folder selected.")
            if args.pause:
                input("Press Enter to exit...")
            return
        folders = [picked]

    for folder in folders:
        if not folder.exists():
            print(f"[WARN] Folder not found: {folder}")
            continue
        if not folder.is_dir():
            print(f"[WARN] Not a folder: {folder}")
            continue
        compress_folder(
            folder,
            quality,
            args.png_lossy,
            args.png_colors,
            args.keep_metadata,
            args.copy_others,
            args.dry_run,
        )

    if args.pause:
        input("Press Enter to exit...")


if __name__ == "__main__":
    main()
