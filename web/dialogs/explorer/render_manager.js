import { $el } from "../../../../scripts/ui.js";
import { api_get, api_post, mk_endpoint } from "../../utils.js";
import { EditorDialog } from "./editor_dialog.js";

export class FileRenderManager {
    constructor(parent) {
        this.parent = parent;
        this._width = 150;
        this._height = 200;
    }

    get width() {
        return this._width;
    }
    set width(value) {
        this._width = value;
        if (this.parent.files) {
            const files = this.parent.files.querySelectorAll("div.jupo-preset-explorer-view-files-item");
            files.forEach(item => {
                item.style.width = `${value}px`;
            });
        }
    }

    get height() {
        return this._height;
    }
    set height(value) {
        this._height = value;
        if (this.parent.files) {
            const files = this.parent.files.querySelectorAll("div.jupo-preset-explorer-view-files-item");
            files.forEach(item => {
                item.style.height = `${value}px`;
            });
        }
    }

    // ------------------------------------------
    // ディレクトリアイテム
    // ------------------------------------------
    createDirItem(name, callback) {
        const label = `📁 ${name}`;

        const item = $el("div.jupo-preset-explorer-view-dirs-item", {
            textContent: label
        });
        item.addEventListener("click", callback);

        return item;
    }

    // ------------------------------------------
    // ファイルなし
    // ------------------------------------------
    createEmptyItem() {
        return $el("p.jupo-preset-explorer-view-files-empty", {
            textContent: "このディレクトリにファイルはありません"
        });
    }


    // ------------------------------------------
    // 新規作成アイテム
    // ------------------------------------------
    createNewFileItem(callback) {
        const item = $el("div.jupo-preset-explorer-view-files-item.new", {
            title: "新規作成", 
            style: {
                width: `${this.width}px`, 
                height: `${this.height}px`
            }
        });
        item.append($el("i.mdi.mdi-tag-plus"));
        item.addEventListener("click", callback);

        return item;
    }


    // ------------------------------------------
    // ファイルアイテム
    // ------------------------------------------
    createFileItem(node, callback) {
        const item = $el("div.jupo-preset-explorer-view-files-item", {
            title: this.#createTitleText(node), 
            style: {
                width: `${this.width}px`, 
                height: `${this.height}px`
            }
        });
        item.addEventListener("click", (e) => {
            if (!e.target.closest(".jupo-file-explorer-view-files-item-action")) {
                callback?.();
            }
        });

        const overlay = $el("div.jupo-preset-explorer-view-files-item-overlay", [
            ...this.#createOverlayText(node)
        ]);

        const editButton = $el("button.jupo-preset-explorer-view-files-item-action.edit", [$el("i.mdi.mdi-file-edit")]);
        editButton.title = "編集";
        editButton.addEventListener("click", async (e) => {
            e.stopPropagation();
            const editor = new EditorDialog(this.parent, node);
            await editor.show();
        });

        const deleteButton = $el("button.jupo-preset-explorer-view-files-item-action.delete", [$el("i.mdi.mdi-delete-forever")]);
        deleteButton.title = "削除";
        deleteButton.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm("ファイルを削除しますか？")) {
                await api_post("delete_file", { path: node.fullPath });
                await this.parent.refresh();
            }
        });

        const actions = $el("div.jupo-preset-explorer-view-files-item-actions", [editButton, deleteButton]);

        item.append(overlay, actions);
        return item;
    }

    #createTitleText(node) {
        const title = [];
        if (node.fullPath) title.push(node.fullPath);
        if (node.desc) title.push(node.desc);
        if (node.note) title.push(node.note);

        return title.join("\n");
    }

    #createOverlayText(node) {
        const overlay = [];

        const name = node.displayName ? node.displayName : this.#getFilenameWithoutExt(node.fullPath);
        overlay.push($el("p.name", { textContent: name }));

        if (node.desc) {
            overlay.push($el("p.desc", { textContent: node.desc}));
        }
        return overlay;
    }

    #getFilenameWithoutExt(path) {
        const filenameWithExt = path.split('/').pop();
        return filenameWithExt.substring(0, filenameWithExt.lastIndexOf(".")) || filenameWithExt;
    }


    // ------------------------------------------
    // ファイルメディア読込
    // ------------------------------------------
    async loadMedia(itemElement, file) {
        try {
            const mediaData = await api_get("preview/" + encodeURIComponent(file.fullPath));
            let mediaElement;

            if (mediaData.token) {
                const url = mk_endpoint(`media/${mediaData.token}`);
                if (mediaData.cate === "image") {
                    mediaElement = $el("img.jupo-preset-explorer-view-files-item-media", {
                        src: url, 
                        alt: file.fullPath, 
                        loading: "lazy"
                    });
                } else if (mediaData.cate === "video") {
                    mediaElement = $el("video.jupo-preset-explorer-view-files-item-media", {
                        src: url, 
                        muted: true, 
                        loop: true, 
                        preload: "metadata"
                    });

                    itemElement.addEventListener("mouseenter", () => {
                        this.pauseAllMedia();
                        mediaElement.play().catch(e => console.warn("Autoplay failed: ", e));
                    });
                    itemElement.addEventListener("mouseleave", () => {
                        mediaElement.pause();
                        mediaElement.currentTime = 0;
                    });
                } else if (mediaData.cate === "audio") {
                    mediaElement = $el("audio.jupo-preset-explorer-view-files-item-media", {
                        src: url, 
                        volume: 0.5, 
                        loop: true, 
                        preload: "metadata"
                    });

                    itemElement.addEventListener("mouseenter", () => {
                        this.pauseAllMedia();
                        mediaElement.play().catch(e => console.warn("Autoplay failed: ", e));
                    });
                    itemElement.addEventListener("mouseleave", () => {
                        mediaElement.pause();
                        mediaElement.currentTime = 0;
                    });
                }
            } else {
                // 空のメディア表示を追加
                mediaElement = $el("div.jupo-preset-explorer-view-files-item-media.empty", {
                    textContent: "No Preview"
                });
            }

            if (mediaElement) {
                itemElement.prepend(mediaElement);
            }
        
        } catch (error) {
            console.error("メディアの読込に失敗しました: ", error);
        }
    }
    


    // ------------------------------------------
    // 動画停止
    // ------------------------------------------
    pauseAllMedia() {
        if (!this.parent.files) return;

        const videos = this.parent.files.querySelectorAll("video");
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
        const audios = this.parent.files.querySelectorAll("audio");
        audios.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }
}