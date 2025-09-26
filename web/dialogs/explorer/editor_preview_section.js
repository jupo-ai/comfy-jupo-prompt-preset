import { $el } from "../../../../scripts/ui.js";
import { loadCSS, mk_endpoint, api_get, api_post } from "../../utils.js";

loadCSS("dialogs/explorer/css/editor_preview_section.css");


export class PreviewSection {
    constructor({ node, onUpload, onDelete }) {
        this.element = null;
        this.media = null;
        this.node = node;
        this.onUpload = onUpload;
        this.onDelete = onDelete;
        this.newFileMode = node.type === "dir";

        this.createUI();
    }

    // ------------------------------------------
    // UIを作成
    // ------------------------------------------
    createUI() {
        this.element = $el("div.jupo-preset-editor-preview");
        this.mediaContainer = $el("div.jupo-preset-editor-preview-media-container");

        this.uploadButton = $el("button.upload", [
            $el("i.mdi.mdi-file-upload"), 
            "Upload"
        ]);
        this.uploadButton.addEventListener("click", () => this.fileInput.click());

        this.fileInput = $el("input", {
            type: "file", 
            accept: "image/*, video/*, audio/*", 
            style: { display: "none" }, 
            onchange: async (e) => await this.handleFileUpload(e)
        });

        this.deleteButton = $el("button.delete", [
            $el("i.mdi.mdi-delete-empty"), 
            "Delete"
        ]);
        this.deleteButton.addEventListener("click", async () => await this.handleFileDelete());

        const actionContainer = $el("div.jupo-preset-editor-preview-actions", [
            this.uploadButton, 
            this.fileInput, 
            this.deleteButton
        ]);

        this.element.append(this.mediaContainer, actionContainer);

        if (this.newFileMode) {
            const overlay = $el("div.jupo-preset-editor-preview-disable", {
                textContent: "メディアはファイルを保存してから設定してください"
            });
            this.element.append(overlay);
        }
    }


    // ------------------------------------------
    // イベントハンドラ
    // ------------------------------------------
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.onUpload) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const filePayload = {
                name: file.name, 
                data: e.target.result
            };
            await this.onUpload(filePayload);
        };
        reader.onerror = (error) => {
            console.error("ファイルの読込に失敗しました: ", error);
        }
        reader.readAsDataURL(file);

        event.target.value = "";
    }

    async handleFileDelete() {
        if (!this.onDelete || !this.media) return;

        if (confirm("プレビューを削除しますか？")) {
            await this.onDelete();
        }
    }


    // ------------------------------------------
    // ユーティリティ
    // ------------------------------------------
    clear() {
        if (this.media) {
            this.stopMedia();
        }
        this.mediaContainer.replaceChildren();
        this.media = null;
    }

    stopMedia() {
        if (!this.media) return;

        const tagName = this.media.tagName;
        if (tagName === "VIDEO" || tagName === "AUDIO") {
            this.media.pause();
            this.media.currentTime = 0;
        }
    }

    showEmpty() {
        this.clear();
        const noPreviewElement = $el("div.jupo-preset-editor-preview-empty", {
            textContent: "Empty"
        });
        this.mediaContainer.append(noPreviewElement);
    }

    createMedia(type, url) {
        const commonProps = {
            className: `jupo-preset-editor-preview-media jupo-preset-editor-preview-media--${type}`, 
            src: url, 
            onerror: () => this.showEmpty()
        };

        switch (type) {
            case "image":
                return $el("img", {
                    ...commonProps, 
                    crossOrigin: "anonymous"
                });
            
            case "video":
                return $el("video", {
                    ...commonProps, 
                    controls: true, 
                    muted: true, 
                    autoplay: true, 
                    loop: true,
                    preload: "metadata"
                });
            
            case "audio":
                return $el("audio", {
                    ...commonProps, 
                    controls: true, 
                    preload: "metadata"
                });
            
            default:
                return null;
        }
    }


    // ------------------------------------------
    // メディアを読込
    // ------------------------------------------
    async display() {
        this.clear();
        if (this.newFileMode) return;

        const mediaData = await api_get(`preview/${encodeURIComponent(this.node.fullPath)}`);
        
        if (!mediaData.token) {
            this.showEmpty();
            return;
        }

        const { token, cate } = mediaData;
        const url = mk_endpoint(`media/${token}`);

        try {
            this.media = this.createMedia(cate, url);
            if (this.media) {
                this.mediaContainer.append(this.media);
            }
        } catch(error) {
            console.warn("プレビューの表示に失敗: ", error);
            this.showEmpty();
        }
    }
}