import { app } from "../../../../scripts/app.js";
import { $el } from "../../../../scripts/ui.js";
import { get_config } from "../../config.js";
import { loadCSS } from "../../utils.js";
import { BasePresetExplorer } from "./base_explorer.js";

loadCSS("dialogs/explorer/css/preset_explorer_modal.css");
const DEFAULT_Z_INDEX = 2000;

// ==============================================
// プリセットエクスプローラ (Modal用)
// ==============================================
export class PresetExplorerModal extends BasePresetExplorer {
    constructor(fileList, callback) {
        super(fileList);
        this.callback = callback;

        this.createOverlay();
    }

    // ------------------------------------------
    // コンフィグ設定
    // ------------------------------------------
    setupConfig() {
        super.setupConfig();

        this.addConfig({
            id: "GridWidthModal", 
            name: "グリッドアイテム横幅", 
            type: "number", 
            defaultValue: 150, 
            option: {
                max: 300, 
                min: 100,
                step: 1,  
            }, 
            onChange: (value) => {
                this.renderer.width = value;
            }
        });

        this.addConfig({
            id: "GridHeightModal", 
            name: "グリッドアイテム高さ", 
            type: "number", 
            defaultValue: 200, 
            option: {
                max: 300, 
                min: 100, 
                step: 1, 
            }, 
            onChange: (value) => {
                this.renderer.height = value;
            }
        });

        this.addConfig({
            id: "DisplayDirListModal", 
            name: "ディレクトリリストを表示", 
            type: "boolean", 
            defaultValue: false, 
            onChange: (value) => {
                this.toggleDirs(value);
            }
        });

        this.addConfig({
            id: "DisplayTreeModal", 
            name: "ディレクトリツリーを表示", 
            type: "boolean", 
            defaultValue: true, 
            onChange: (value) => {
                this.toggleTree(value);
            }
        });
    }


    // ------------------------------------------
    // モーダル用オーバーレイ作成
    // ------------------------------------------
    createOverlay() {
        this.parentEl = $el("div.jupo-preset-explorer-modal-overlay");
        this.parentEl.addEventListener("mousedown", (e) => {
            if (e.target === this.parentEl) {
                this.close();
            }
        });
    }


    // ------------------------------------------
    // ユーティリティ
    // ------------------------------------------
    getMaxIndex(className) {
        const elements = document.body.querySelectorAll(className);
        const zIndexes = Array.from(elements).map(element => {
            return parseInt(window.getComputedStyle(element).zIndex, 10) || 0;
        });

        return zIndexes.length > 0 ? Math.max(...zIndexes) : DEFAULT_Z_INDEX;
    }

    async restoreDirsVisible() {
        const config = this.config.find(c => c.id === "DisplayDirListModal");
        if (config) {
            const value = await get_config(config.id) ?? config.defaultValue;
            this.toggleDirs(value);
        }
    }


    // ------------------------------------------
    // ファイルクリック時コールバック
    // ------------------------------------------
    onFileClicked(fileNode) {
        this.callback?.(fileNode);
        this.close();
    }


    // ------------------------------------------
    // 表示 / 閉じる
    // ------------------------------------------
    async show(currentPath) {
        await super.show(currentPath);
        
        const zIndex = this.getMaxIndex(".jupo-preset-explorer-modal-overlay");
        this.parentEl.style.zIndex = zIndex + 1;

        this.element.classList.add("jupo-preset-explorer-modal");
        this.parentEl.append(this.element);
        document.body.append(this.parentEl);
    }

    close() {
        this.parentEl.remove();
    }
}