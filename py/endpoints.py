from .utils import Endpoint
from . import paths

from aiohttp import web
from pathlib import Path
import json
import os
import subprocess
import platform
import hashlib
import time
import mimetypes
import uuid
from urllib.parse import urlparse, unquote
from tqdm import tqdm
import aiofiles
import base64
import glob
import time
import folder_paths


# ===============================================
# エンドポイント
# ===============================================
# --- コンフィグを取得 ---
@Endpoint.get("get_config/{key}")
async def get_config(req: web.Request):
    key = req.match_info["key"]
    
    config = {}
    try:
        with open(paths.config_file, mode="r", encoding="utf-8") as file:
            config = json.load(file)
    except:
        pass

    value = config.get(key, None)

    return web.json_response(value)


# --- コンフィグを保存 ---
@Endpoint.post("set_config/{key}")
async def set_config(req: web.Request):
    key = req.match_info["key"]
    data = await req.json()
    value = data.get("value")

    config = {}
    try:
        with open(paths.config_file, mode="r", encoding="utf-8") as file:
            config = json.load(file)
    except:
        pass

    config[key] = value
    
    with open(paths.config_file, mode="w", encoding="utf-8") as file:
        json.dump(config, file, ensure_ascii=False, indent=4)
    
    return web.json_response({"status": "success"})
    


# --- プリセットファイルのリストを取得 ---
@Endpoint.get("get_files")
async def get_files(req: web.Request):
    files = paths.preset_dir.glob("**/*.json")
    res = []

    for file in files:
        with open(file, mode="r", encoding="utf-8") as f:
            data = json.load(f)

        name = data.get("name", "")
        desc = data.get("desc", "")
        note = data.get("note", "")
        positive = data.get("positive", "")
        negative = data.get("negative", "")
        mode = data.get("mode", "append")
        model = data.get("model", "")

        res.append({
            "path": str(file.relative_to(paths.preset_dir)),  # 相対パス
            "name": name, 
            "desc": desc, 
            "note": note, 
            "positive": positive, 
            "negative": negative, 
            "mode": mode, 
            "model": model, 
        })
    
    return web.json_response(res)



# --- プリセットjsonを保存 ---
@Endpoint.post("save_file")
async def save_file(req: web.Request):
    res = await req.json()
    data = res.get("data", {})
    
    relative_path_str = data.get("path")
    if not relative_path_str:
        return web.json_response({"message": "File path cannot be empty"}, status=400)
    
    full_file_path = paths.preset_dir / relative_path_str

    try:
        full_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_file_path, mode="w", encoding="utf-8") as file:
            json.dump({
                "name": data.get("name", ""), 
                "desc": data.get("desc", ""), 
                "note": data.get("note", ""), 
                "positive": data.get("positive", ""), 
                "negative": data.get("negative", ""), 
                "mode": data.get("mode", "append"), 
                "model": data.get("model", "")
            }, file, ensure_ascii=False, indent=4)

    except (IOError, OSError) as e:
        message = f"Failed to write file: {e}"
        print(message)
        return web.json_response({"message": message}, status=500)
    
    return web.json_response({"status": "success"})


# --- 個別にプリセットjsonを取得 ---
@Endpoint.post("read_preset")
async def read_preset(req: web.Request):
    data = await req.json()
    path = data.get("path")
    full_path = paths.preset_dir / path

    res = {}
    if (os.path.isfile(full_path)):
        with open(full_path, mode="r", encoding="utf-8") as f:
            res = json.load(f)
    
    return web.json_response(res)


# --- プリセットフォルダを開く ---
@Endpoint.post("open_preset_folder")
async def open_preset_folder(req: web.Request):
    
    path = str(paths.preset_dir)

    system = platform.system()
    if system == "Windows":
        os.startfile(path)
    elif system == "Darwin":
        subprocess.run(["open", path])
    else:
        subprocess.run(["xdg-open", path])
    
    return web.json_response({"status": "success"})



# --- ファイルメディアを取得 ---
MEDIA_CACHE = {}
TOKEN_EXPIRE_TIME = 3600
SUPPORTED_EXTENSIONS = {
    "image": ["jpg", "jpeg", "bmp", "png", "webp", "gif"], 
    "video": ["mp4", "webm"], 
    "audio": ["mp3", "ogg", "wav"]
}

def cleanup_expired_tokens():
    """期限切れトークンを削除"""
    global MEDIA_CACHE
    
    current_time = time.time()
    expired_tokens = [
        token for token, data in MEDIA_CACHE.items()
        if current_time - data.get("created_at", 0) > TOKEN_EXPIRE_TIME
    ]
    
    for token in expired_tokens:
        del MEDIA_CACHE[token]


def get_media_path(file_path):
    file_no_ext = os.path.splitext(file_path)[0]

    for cate, exts in SUPPORTED_EXTENSIONS.items():
        for ext in exts:
            media_path = f"{file_no_ext}.{ext}"
            if os.path.isfile(media_path):
                return (cate, media_path)
    
    return (None, None)
    

@Endpoint.get("preview/{path}")
async def get_preview_media(req: web.Request):
    res = {"path": None, "cate": None, "token": None}
    cleanup_expired_tokens()
    
    try:
        path = req.match_info["path"]
        fullpath = str(paths.preset_dir / path)
        
        cate, media_path = get_media_path(fullpath)
        if media_path:
            token = str(uuid.uuid4())
            MEDIA_CACHE[token] = {
                "path": media_path, 
                "cate": cate, 
                "created_at": time.time()
            }
            
            res["path"] = media_path
            res["cate"] = cate
            res["token"] = token
        
        return web.json_response(res)
    
    except Exception as e:
        print(f"Error processing media token request: {e}")
        return web.json_response(res)


@Endpoint.get("media/{token}")
async def serve_media(req: web.Request):
    """トークン経由でメディアファイルを取得"""
    global MEDIA_CACHE
    
    try:
        token = req.match_info["token"]
        media_data = MEDIA_CACHE.get(token)
        if not media_data:
            return web.json_response({"message": "Token not found or expired"}, status=404)
        
        media_path = media_data.get("path")
        if not os.path.isfile(media_path):
            # ファイルが存在しない場合、キャッシュからも削除
            del MEDIA_CACHE[token]
            return web.json_response({"message": f"Media file not found: {media_path}"}, status=404)
        
        # MIMEタイプ
        mime_type, encoding = mimetypes.guess_type(media_path)
        if not mime_type:
            cate = media_data.get("cate")
            if cate == "image":
                mime_type = "image/jpeg"
            elif cate == "video":
                mime_type = "video/mp4"
            else:
                mime_type = "application/octet-stream"
        
        headers = {"Content-Type": mime_type}
        if encoding:
            headers["Content-Encoding"] = encoding
        
        return web.FileResponse(media_path, headers=headers)
    
    except Exception as e:
        print(f"Error serving media: {e}")
        return web.json_response({"message": "Internal server error"}, status=500)


def remove_media(file_path):
    file_no_ext = os.path.splitext(file_path)[0]
    
    for _, exts in SUPPORTED_EXTENSIONS.items():
        for ext in exts:
            media_path = f"{file_no_ext}.{ext}"
            if os.path.isfile(media_path):
                os.remove(media_path)
                print(f"Delete: {media_path}")


# --- プリセットjsonを削除 --- 
@Endpoint.post("delete_file")
async def delete_file(req: web.Request):
    data = await req.json()
    file_path = data.get("path")
    file_path = str(paths.preset_dir / file_path)
    
    if not os.path.isfile(file_path):
        return web.json_response({"message": f"file not found: {file_path}"}, status=400)
    
    remove_media(file_path)
    os.remove(file_path)
    print(f"Delete: {file_path}")

    return web.json_response({"status": "success"})


# --- プレビューアップロード ---
@Endpoint.post("save_as_preview")
async def save_as_preview(req: web.Request):
    data = await req.json()
    file_payload = data.get("file")
    file_path = data.get("path")
    file_path = str(paths.preset_dir / file_path)
    file_path = unquote(file_path).replace("\\", "/")

    remove_media(file_path)
    
    ext = os.path.splitext(file_payload["name"])[1]
    if not ext:
        return web.json_response({"message": "Could not determine file extension."}, status=400)

    file_no_ext = os.path.splitext(file_path)[0]
    save_path = f"{file_no_ext}{ext}"
    print(f"Saving uploaded media to: {save_path}")
    
    file_data_base64 = file_payload.get("data")
    _header, encoded_data = file_data_base64.split(",", 1)
    decoded_data = base64.b64decode(encoded_data)

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(decoded_data)
    
    print("Save compelte")
    
    return web.json_response({"status": "success"})



# --- プレビュー削除 ---
@Endpoint.post("delete_preview")
async def delete_preview(req: web.Request):
    data = await req.json()
    file_path = data.get("path")
    file_path = str(paths.preset_dir / file_path)
    file_path = unquote(file_path).replace("\\", "/")
    
    remove_media(file_path)
    
    return web.json_response({"status": "success"})



# --- チェックポイントリストを取得 ---
@Endpoint.get("get_checkpoints")
async def get_checkpoint(req: web.Request):
    files = folder_paths.get_filename_list("checkpoints")

    return web.json_response(files)


