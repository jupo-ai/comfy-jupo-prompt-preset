import { app } from "../../../../scripts/app.js";
import { $el } from "../../../../scripts/ui.js";
import { get_config } from "../../config.js";
import { loadCSS } from "../../utils.js";
import { BasePresetExplorer } from "./base_explorer.js";

loadCSS("dialogs/explorer/css/preset_explorer_sidebar.css");

// ==============================================
// プリセットエクスプローラ (Sidebar用)
// ==============================================
export class PresetExplorerSidebar extends BasePresetExplorer {
    constructor(fileList, parentEl, callback, updatePathCallback) {
        super(fileList);
        this.parentEl = parentEl;
        this.callback = callback;
        this.updatePathCallback = updatePathCallback;
        this.parentEl.style.height = "100%";
    }


    // ------------------------------------------
    // コンフィグ設定
    // ------------------------------------------
    setupConfig() {
        super.setupConfig();

        this.addConfig({
            id: "GridWidthSidebar", 
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
            id: "GridHeightSidebar", 
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
            id: "DisplayDirListSidebar", 
            name: "ディレクトリリストを表示", 
            type: "boolean", 
            defaultValue: true, 
            onChange: (value) => {
                this.toggleDirs(value);
            }
        });

        this.addConfig({
            id: "DisplayTreeSidebar", 
            name: "ディレクトリツリーを表示", 
            type: "boolean", 
            defaultValue: false, 
            onChange: (value) => {
                this.toggleTree(value);
            }
        });
    }


    // ------------------------------------------
    // ユーティリティ
    // ------------------------------------------
    async restoreDirsVisible() {
        const config = this.config.find(c => c.id === "DisplayDirListSidebar");
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
        this.updatePathCallback?.(fileNode);
    }


    // ------------------------------------------
    // 表示 / 閉じる
    // ------------------------------------------
    async show(currentPath) {
        await super.show(currentPath);
        
        this.element.classList.add("jupo-preset-explorer-sidebar");
        this.parentEl.append(this.element);
    }

    close() {
        this.element.remove();
        app.extensionManager.sidebarTab.toggleSidebarTab();
        this.updatePathCallback?.(this.currentDir);
    }
}