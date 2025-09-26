import { BaseWidget } from "./base.js";
import { CONSTANTS } from "../ui.js";

// ==============================================
// スペーサー
// ==============================================

export class SpacerWidget extends BaseWidget {
    constructor(name = "spacer", margin = {}) {
        super(name);
        this.value = "";
        this.margin = {
            top: CONSTANTS.MARGIN, 
            bottom: CONSTANTS.MARGIN, 
            ...margin
        }
    }

    draw(ctx, node, width, y, height) {}

    computeSize(width) {
        const height = this.margin.top + this.margin.bottom;
        return [width, height];
    }
}
