import { app } from "../../scripts/app.js";

// ----------------------------------------------
// コンテキストメニューパッチ
// ----------------------------------------------

export function applyContextMenuPatch(classNames) {

    const canvasPrototype = app.canvas.constructor.prototype;
    const orig_processContextMenu = canvasPrototype.processContextMenu;

    canvasPrototype.processContextMenu = function(node, e) {
        // 対象ノードかチェック
        if (node && classNames.includes(node.constructor.comfyClass)) {
            const canvas_pos = this.convertEventToCanvasOffset(e);
            const mouse_pos = [canvas_pos[0] - node.pos[0], canvas_pos[1] - node.pos[1]];

            // ウィジェットの領域内をクリックしたかチェック
            const clickedWidget = node.getClickedWidget?.(mouse_pos[0], mouse_pos[1]);
            if (clickedWidget) {
                clickedWidget.showContextMenu?.(e, node);
                return;
            }
        }

        // 条件に合わない場合は、デフォルトのコンテキストメニュー
        return orig_processContextMenu?.apply(this, arguments);
    }
}