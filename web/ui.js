import { app } from "../../scripts/app.js";
import { api_get, api_post } from "./utils.js";
import { PresetExplorerModal } from "./dialogs/explorer/preset_explorer_modal.js";
import { PresetExplorerSidebar } from "./dialogs/explorer/preset_explorer_sidebar.js";

// ==============================================
// ウィジェットの共通定数
// ==============================================
export const CONSTANTS = {
    // 全体
    MARGIN_X: 10,
    FONT: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 

    // プリセットウィジェット
    PILL: {
        HEIGHT: 24, 
        MIN_WIDTH: 200,
        PADDING_X: 8,
        PADDING_Y: 4,  
        RADIUS: 8, 
        GAP: 8, 
    }, 

    // トグルスイッチ
    TOGGLE: {
        WIDTH: 36, 
        RADIUS: 6, 
    }, 

    // 追加ボタン
    BUTTON: {
        HEIGHT: 28, 
        RADIUS: 8, 
    }, 

    // 削除ボタン
    DELETE: {
        WIDTH: 20, 
        RADIUS: 4, 
    }, 

    // 数値
    NUMBER: {
        WIDTH: 70, 
        STEPS: 0.05, 
        DRAG_SENSITIVITY: 0.05, 
    }
};


// ==============================================
// ユーティリティ
// ==============================================
export const Utils = {
    isLowQuality: () => ((app.canvas.ds?.scale) || 1) <= 0.5, 

    fitString: (ctx, str, maxWidth) => {
        const width = ctx.measureText(str).width;
        const ellipsis = "…";
        const ellipsisWidth = ctx.measureText(ellipsis).width;

        if (width <= maxWidth || width <= ellipsisWidth) return str;

        let i = str.length;
        while (i > 0 && ctx.measureText(str.substring(0, i)).width + ellipsisWidth > maxWidth) {
            i--;
        }
        return str.substring(0, i) + ellipsis;
    }, 

    formatDisplayName: (fullPath, showFullPath = false, displayName = null) => {
        if (displayName) return displayName;
        if (showFullPath) return fullPath;

        // パス形式のものをファイル名のみにする
        const lastSlash = Math.max(
            fullPath.lastIndexOf("/"), fullPath.lastIndexOf("\\")
        );
        let fileName = lastSlash !== -1 ? fullPath.substring(lastSlash + 1) : fullPath

        const dotIndex = fileName.lastIndexOf(".");
        if (dotIndex !== -1) {
            fileName = fileName.substring(0, dotIndex);
        }

        return fileName;
    }, 
};


// ==============================================
// 共通描画関数
// ==============================================
export const Renderer = {
    drawToggleSwitch(ctx, x, y, state) {
        if (Utils.isLowQuality()) return;

        const toggleWidth = CONSTANTS.TOGGLE.WIDTH;
        const toggleHeight = CONSTANTS.PILL.HEIGHT - CONSTANTS.PILL.PADDING_Y * 2;
        const toggleY = y + CONSTANTS.PILL.PADDING_Y;
        const enabled = state === "on";

        ctx.save();

        // トグル背景
        ctx.beginPath();
        ctx.roundRect(x, toggleY, toggleWidth, toggleHeight, toggleHeight / 2);
        ctx.fillStyle = enabled ? "#48bb78" : "#4a5568";
        ctx.fill();

        ctx.strokeStyle = enabled ? "#38a169" : "#2d3748";
        ctx.lineWidth = 1;
        ctx.stroke();

        // トグつまみ
        const circleRadius = (toggleHeight - 4) / 2;
        let circleX;
        if (state === "on") {
            circleX = x + toggleWidth - circleRadius - 2;
        } else if (state === "off") {
            circleX = x + circleRadius + 2;
        } else {
            circleX = x + toggleWidth / 2;
        }
        const circleY = toggleY + toggleHeight / 2;

        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}



// ==============================================
// プリセット選択ダイアログ
// ==============================================
export const Chooser = {
    
    async getFileList() {
        const presets = await api_get("get_files");
        return [...(Array.isArray(presets) ? presets : [])];
    }, 

    async showModal(currentPath, callback) {
        const fileList = await this.getFileList();
        const explorer = new PresetExplorerModal(fileList, callback);
        await explorer.show(currentPath);
    }, 

    async showSidebar(currentPath, parentEl, callback, updatePathCallback) {
        const fileList = await this.getFileList();
        const explorer = new PresetExplorerSidebar(fileList, parentEl, callback, updatePathCallback);
        await explorer.show(currentPath);
    }, 
};