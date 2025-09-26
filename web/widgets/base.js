import { CONSTANTS } from "../ui.js";

// ==============================================
// カスタムウィジェットの基底クラス
// ==============================================
export class BaseWidget {
    constructor(name, type = "custom") {
        this.type = type;
        this.name = name;
        this.options = {};
        this.y = 0;
        this.last_y = 0;

        this.mouseDowned = null;
        this.isMouseDownedAndOver = false;

        // ヒット判定用エリア
        this.hitAreas = {};

        // 押下中のヒットエリア追跡用
        this.downedHitAreasForMove = [];
        this.downedHitAreasForClick = [];
    }

    // --- pos が bounds 内にあるか判定 ---
    clickWasWithinBounds(pos, bounds) {
        const [x, y] = pos;

        if (bounds.length === 2) {
            const [xStart, xEnd] = bounds;
            return x >= xStart && x <= xEnd;
        }

        if (bounds.length === 4) {
            const [xStart, yStart, width, height] = bounds;
            const xEnd = xStart + width;
            const yEnd = yStart + height;
            return x >= xStart && x <= xEnd && y >= yStart && y <= yEnd;
        }

        throw new Error(
            "bounds must be either [xStart, xEnd] or [xStart, yStart, width, height]"
        );
    }

    // --- マウスイベントルーティング ---
    mouse(event, pos, node) {
        switch (event.type) {
            case "pointerdown":
                return this.handlePointerDown(event, pos, node);
            case "pointerup":
                return this.handlePointerUp(event, pos, node);
            case "pointermove":
                return this.handlePointerMove(event, pos, node);
            default:
                return false;
        }
    }

    // --- pointerdown ハンドラ ---
    handlePointerDown(event, pos, node) {
        this.mouseDowned = [...pos];
        this.isMouseDownedAndOver = true;

        this.downedHitAreasForMove.length = 0;
        this.downedHitAreasForClick.length = 0;

        let anyHandled = false;

        for (const part of Object.values(this.hitAreas)) {
            if (this.clickWasWithinBounds(pos, part.bounds)) {
                if (part.onMove) this.downedHitAreasForMove.push(part);
                if (part.onClick) this.downedHitAreasForClick.push(part);
                if (part.onDown) {
                    const handled = part.onDown.apply(this, [event, pos, node, part]);
                    anyHandled = anyHandled || handled === true;
                }
                part.wasMouseClickedAndIsOver = true;
            }
        }

        return this.onMouseDown?.(event, pos, node) ?? anyHandled;
    }

    // --- pointerup ハンドラ ---
    handlePointerUp(event, pos, node) {
        if (!this.mouseDowned) return true;

        this.downedHitAreasForMove.length = 0;
        const wasMouseDownedAndOver = this.isMouseDownedAndOver;

        this.cancelMouseDown();

        let anyHandled = false;

        // onUp を呼ぶ
        for (const part of Object.values(this.hitAreas)) {
            if (part.onUp && this.clickWasWithinBounds(pos, part.bounds)) {
                const handled = part.onUp.apply(this, [event, pos, node, part]);
                anyHandled = anyHandled || handled === true;
            }
            part.wasMouseClickedAndIsOver = false;
        }

        // onClick を呼ぶ
        for (const part of this.downedHitAreasForClick) {
            if (this.clickWasWithinBounds(pos, part.bounds)) {
                const handled = part.onClick.apply(this, [event, pos, node, part]);
                anyHandled = anyHandled || handled === true;
            }
        }
        this.downedHitAreasForClick.length = 0;

        // 全体クリックイベント
        if (wasMouseDownedAndOver) {
            const handled = this.onMouseClick?.(event, pos, node);
            anyHandled = anyHandled || handled === true;
        }

        return this.onMouseUp?.(event, pos, node) ?? anyHandled;
    }

    // --- pointermove ハンドラ ---
    handlePointerMove(event, pos, node) {
        this.isMouseDownedAndOver = !!this.mouseDowned;

        if (this.mouseDowned) {
            const [x, y] = pos;
            if (
                x < CONSTANTS.MARGIN ||
                x > node.size[0] - CONSTANTS.MARGIN ||
                y < this.last_y ||
                y > this.last_y + CONSTANTS.PILL_HEIGHT
            ) {
                this.isMouseDownedAndOver = false;
            }
        }

        for (const part of Object.values(this.hitAreas)) {
            if (this.downedHitAreasForMove.includes(part)) {
                part.onMove.apply(this, [event, pos, node, part]);
            }
            if (this.downedHitAreasForClick.includes(part)) {
                part.wasMouseClickedAndIsOver = this.clickWasWithinBounds(pos, part.bounds);
            }
        }

        return this.onMouseMove?.(event, pos, node) ?? true;
    }

    // --- 押下状態リセット ---
    cancelMouseDown() {
        this.mouseDowned = null;
        this.isMouseDownedAndOver = false;
        this.downedHitAreasForMove.length = 0;
    }

    // --- サブクラス用イベント ---
    onMouseDown(event, pos, node) { return; }
    onMouseUp(event, pos, node) { return; }
    onMouseClick(event, pos, node) { return; }
    onMouseMove(event, pos, node) { return; }
}
