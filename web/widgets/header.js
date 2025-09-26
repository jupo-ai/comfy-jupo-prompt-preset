import { BaseWidget } from "./base.js";
import { CONSTANTS, Renderer, Utils } from "../ui.js";

// ==============================================
// ヘッダーウィジェット
// ==============================================

export class HeaderWidget extends BaseWidget {
    constructor(name) {
        super(name);
        this.value = "";
        this.hitAreas = {
            toggle: { bounds: [0, 0], onClick: this.onToggleClick }
        };
    }

    draw(ctx, node, width, y, height) {
        if (Utils.isLowQuality()) return;
        if (node.getPresetWidgets().length === 0) return;

        ctx.save();

        const margin = CONSTANTS.MARGIN_X;
        const padding = CONSTANTS.PILL.PADDING_X;
        let currentX = margin + padding;

        // トグル状態を決定
        const state = this.getState(node);

        // トグルスイッチを描画
        Renderer.drawToggleSwitch(ctx, currentX, y, state);
        this.hitAreas.toggle.bounds = [currentX, y, CONSTANTS.TOGGLE.WIDTH, CONSTANTS.PILL.HEIGHT];
        currentX += CONSTANTS.TOGGLE.WIDTH + CONSTANTS.PILL.GAP;
         
        // ラベル描画
        ctx.font = `bold 12px ${CONSTANTS.FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#a0aec0";
        ctx.fillText("Preset", currentX, y + CONSTANTS.PILL.HEIGHT/2);

        ctx.restore();
    }

    getState(node) {
        const widgets = node.getPresetWidgets();
        const allEnabled = widgets.every(w => w.value.enabled);
        const allDisabled = widgets.every(w => !w.value.enabled);
        const state = allEnabled ? "on" : (allDisabled ? "off" : "half");
        return state;
    }

    
    onToggleClick(event, pos, node) {
        const state = this.getState(node);
        const allEnabled = state === "on";
        const newState = !allEnabled;
        
        const widgets = node.getPresetWidgets();
        widgets.forEach(w => w.value.enabled = newState);
        node.setDirtyCanvas(true);
        this.cancelMouseDown();
        return true;
    }


    computeSize(width) {
        return [width, CONSTANTS.PILL.HEIGHT];
    }    
}