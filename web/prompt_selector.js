import { app } from "../../scripts/app.js";
import { mk_name } from "./utils.js";
import { Chooser } from "./ui.js";
import { applyContextMenuPatch } from "./context_menu_patch.js";
import { SpacerWidget } from "./widgets/spacer.js";
import { HeaderWidget } from "./widgets/header.js";
import { ButtonWidget } from "./widgets/button.js";
import { PresetWidget } from "./widgets/preset.js";

const classNames = [mk_name("Prompt_Selector")];

const extension = {
    name: mk_name("PromptSelector"), 

    init: async function () {
        applyContextMenuPatch(classNames);
    }, 

    beforeRegisterNodeDef: async function(nodeType, nodeData, app) {
        if (!classNames.includes(nodeType.comfyClass)) return;

        // --------------------------------------
        // onNodeCreated
        // --------------------------------------
        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const res = origOnNodeCreated?.apply(this, arguments);

            // valuesを非表示にする
            const widget = this.widgets.find(w => w.name === "values");
            if (widget) {
                widget.type = "hidden";
                widget.hidden = true;
                widget.disabled = true;
            }

            this.counter = 0;
            this.serialize_widgets = true;
            this.displayMode = "filename" // filename or full
            this.initializeUI();
            this.updateNodeSize();

            return res;
        };


        // --------------------------------------
        // initializeUI
        // --------------------------------------
        nodeType.prototype.initializeUI = function() {
            // ヘッダー
            const header = new HeaderWidget("header");
            this.addCustomWidget(header);

            // スペーサー
            const spacer = new SpacerWidget("spacer", { top: 4, bottom: 4});
            this.addCustomWidget(spacer);

            // 追加ボタン
            const button = new ButtonWidget("addButton", "➕ 追加", async () => {
                await Chooser.showModal(null, (fileNode) => {
                    this.addPresetWidget(fileNode);
                });
                return true;
            });
            this.addCustomWidget(button);
        };


        // --------------------------------------
        // addPresetWidget
        // --------------------------------------
        nodeType.prototype.addPresetWidget = function(fileNode) {
            this.counter++;

            const presetWidget = new PresetWidget(`preset_${this.counter}`, {
                enabled: true, 
                fileNode: fileNode, 
                deleteCallback: (widget) => this.deletePresetWidget(widget), 
                valueChangedCallback: () => this.updateValues(), 
            });

            // spacerの前にウィジェットを挿入
            const spacerIndex = this.widgets.findIndex(w => w.name === "spacer");
            this.widgets.splice(spacerIndex, 0, presetWidget);

            this.updateValues();
            this.updateNodeSize();
            return presetWidget;
        };


        // --------------------------------------
        // deletePresetWidget
        // --------------------------------------
        nodeType.prototype.deletePresetWidget = function(widget) {
            const index = this.widgets.indexOf(widget);
            if (index !== -1) {
                this.widgets.splice(index, 1);
            }
            this.updateValues();
            this.updateNodeSize();
        };


        // --------------------------------------
        // clearAllWidgets
        // --------------------------------------
        nodeType.prototype.clearAllWidgets = function() {
            this.widgets = this.widgets.filter(w => w.name === "values");
        };


        // --------------------------------------
        // updateValues
        // --------------------------------------
        nodeType.prototype.updateValues = function() {
            const valuesWidget = this.widgets.find(w => w.name === "values");
            if (valuesWidget) {
                const widgets = this.getPresetWidgets();
                const values = widgets.map(w => w.value);
                valuesWidget.value = JSON.stringify(values);
            }
        };


        // --------------------------------------
        // updateNodeSize
        // --------------------------------------
        nodeType.prototype.updateNodeSize = function() {
            const computed = this.computeSize();
            this.size[0] = Math.max(this.size[0], computed[0]);
            this.size[1] = Math.max(this.size[1], computed[1]);
            this.setDirtyCanvas(true);
        };


        // --------------------------------------
        // serialize
        // --------------------------------------
        const origSerialize = nodeType.prototype.serialize;
        nodeType.prototype.serialize = function() {
            const data = origSerialize?.apply(this, arguments) || {};

            // ウィジェットの値を保存
            const widgets = this.getPresetWidgets();
            data.widgetValues = widgets.map(w => w.value);
            
            // 表示モードを保存
            data.displayMode = this.displayMode;

            return data;
        };


        // --------------------------------------
        // configure
        // --------------------------------------
        const origConfigure = nodeType.prototype.configure;
        nodeType.prototype.configure = function(data) {
            const res = origConfigure?.apply(this, arguments);

            this.clearAllWidgets();
            this.displayMode = data.displayMode || "filename";
            this.initializeUI();

            // widgetValuesからウィジェットを復元
            if (data.widgetValues && Array.isArray(data.widgetValues)) {
                data.widgetValues.forEach(value => {
                    const widget = this.addPresetWidget(value.fileNode);
                    widget.value = value;
                });
            }

            this.updateValues();
            this.updateNodeSize();
            return res;
        };


        // --------------------------------------
        // 現在のPresetWidgetを取得
        // --------------------------------------
        nodeType.prototype.getPresetWidgets = function() {
            const widgets = this.widgets.filter(w => w instanceof PresetWidget);
            return widgets;
        };


        // --------------------------------------
        // コンテキストメニュー関連
        // --------------------------------------
        nodeType.prototype.getClickedWidget = function(x, y) {
            const widgets = this.getPresetWidgets();
            for (const widget of widgets) {
                if (widget.isClickedAt(x, y, this)) return widget;
            }
            return null;
        };
    }
};

app.registerExtension(extension);