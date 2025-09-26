import { BaseWidget } from "./base.js";
import { CONSTANTS, Utils } from "../ui.js";


// ==============================================
// ボタンウィジェット
// ==============================================

export class ButtonWidget extends BaseWidget {
    constructor(name, label, callback) {
        super(name);
        this.value = "";
        this.label = label || name;
        this.callback = callback;
        this.colors = {
            background: "#48bb78", 
            background_on_downed: "#48bb78", 
            background_border: "#2f855a", 
            text: "#ffffff", 
        };
    }

    // ------------------------------------------
    // 描画
    // ------------------------------------------
    draw(ctx, node, width, y, height) {
        if (Utils.isLowQuality()) return;

        const margin = CONSTANTS.MARGIN_X;
        const buttonWidth = width - margin * 2;
        const buttonHeight = CONSTANTS.BUTTON.HEIGHT;

        ctx.save();
        
        // ボタン背景
        ctx.beginPath();
        ctx.roundRect(
            margin, 
            y + (this.isMouseDownedAndOver ? 1 : 0), 
            buttonWidth, 
            buttonHeight, 
            CONSTANTS.BUTTON.RADIUS
        );
        ctx.fillStyle = this.get_background_color();
        ctx.fill();

        // ボタン背景ボーダー
        ctx.strokeStyle = this.colors.background_border;
        ctx.lineWidth = 1;
        ctx.stroke();

        // ボタンテキスト
        ctx.font = `13px ${CONSTANTS.FONT}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = this.colors.text;
        ctx.fillText(
            this.label, 
            margin + buttonWidth / 2, 
            y + buttonHeight / 2 + (this.isMouseDownedAndOver ? 1 : 0)
        );

        ctx.restore();
    }

    get_background_color() {
        return this.isMouseDownedAndOver
                ? this.colors.background_on_downed
                : this.colors.background;
    }


    // ------------------------------------------
    // コールバック
    // ------------------------------------------
    onMouseClick(event, pos, node) {
        return this.callback?.(event, pos, node) || false;
    }

    
    // ------------------------------------------
    // サイズ
    // ------------------------------------------
    computeSize(width) {
        return [width, CONSTANTS.BUTTON.HEIGHT];
    }
}