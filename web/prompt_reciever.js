import { app } from "../../scripts/app.js";
import { mk_name, api_get } from "./utils.js";


const classNames = [mk_name("Prompt_Reciever")];

const extension = {
    name: mk_name("PromptReciever"), 

    beforeRegisterNodeDef: async function(nodeType, nodeData, app) {
        if (!classNames.includes(nodeType.comfyClass)) return;

        // checkpointリストを取得しておく
        const CHECKPOINTS = await api_get("get_checkpoints");
        
        // --------------------------------------
        // onNodeCreated
        // --------------------------------------
        const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = originalOnNodeCreated?.apply(this, arguments);

            this.positiveTargetWidget = null;
            this.negativeTargetWidget = null;
            this.modelTargetWidget = null;

            return result;
        };

        // --------------------------------------
        // onConnectionsChnage
        // Aargs: 
        //  type: 0 -> output, 1 -> input
        //  index: slotナンバー
        //  isConnected: true -> 接続時, false -> 切断時
        //  inputOrOutput: スロット自身
        // --------------------------------------
        const originalOnConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function(type, index, isConnected, link_info, inputOrOutput) {
            const result = originalOnConnectionsChange?.apply(this, arguments);

            // output側は何もしない
            if (type === 0) return result;

            if (isConnected && link_info) {
                // 接続時
                const widgets = this.getMultilineWidget(link_info);
                const modelWidgets = this.getModelWidget(link_info);

                if (index === 0) {
                    // index = 0: positiveのときは全体の1つ目
                    this.positiveTargetWidget = widgets[0];
                } else if (index === 1) {
                    // widgetsが1つの場合は全体の1つ目
                    // widgtesが2つ以上の場合は2つ目
                    if (widgets.length === 1) {
                        this.negativeTargetWidget = widgets[0];
                    } else {
                        this.negativeTargetWidget = widgets[1];
                    }
                } else if (index === 2) {
                    // index = 2: model_nameの時
                    this.modelTargetWidget = modelWidgets[0];
                }
            } else {
                // 切断時
                if (index === 0) {
                    this.positiveTargetWidget = null;
                } else if (index === 1) {
                    this.negativeTargetWidget = null;
                }
            }
            
            return result;
        };


        // --------------------------------------
        // getMultilineWidget
        // --------------------------------------
        nodeType.prototype.getMultilineWidget = function(link_info) {
            const node = this.graph.getNodeById(link_info.origin_id);
            const multilineWidgets = node.widgets.filter(w => this.isMultilineWidget(w));
            return multilineWidgets;
        };

        nodeType.prototype.isMultilineWidget = function(widget) {
            return !widget.hidden && 
                   !widget.disabled && 
                   widget.element instanceof HTMLTextAreaElement &&
                   widget.element.classList.contains("comfy-multiline-input");
        };


        // --------------------------------------
        // getModelWidget
        // --------------------------------------
        nodeType.prototype.getModelWidget = function(link_info) {
            const node = this.graph.getNodeById(link_info.origin_id);
            const modelWidgets = node.widgets.filter(w => this.isModelWidget(w));
            return modelWidgets;
        }

        nodeType.prototype.isModelWidget = function(widget) {
            // リストaの要素がリストbに全部含まれているか
            const isSubset = (a, b) => {
                return a.every(item => b.includes(item));
            }

            return !widget.hidden &&
                   !widget.disabled &&
                   widget.type === "combo" &&
                   Array.isArray(widget.options.values) &&
                   isSubset(CHECKPOINTS, widget.options.values);
        }


        // --------------------------------------
        // applyData
        // --------------------------------------
        nodeType.prototype.applyData = function(data) {
            if (this.positiveTargetWidget) {
                if (data.mode === "append") {
                    this.positiveTargetWidget.value += data.positive;
                } else if (data.mode === "overwrite") {
                    this.positiveTargetWidget.value = data.positive;
                }
            }

            if (this.negativeTargetWidget) {
                if (data.mode === "append") {
                    this.negativeTargetWidget.value += data.negative;
                } else if (data.mode === "overwrite") {
                    this.negativeTargetWidget.value = data.negative;
                }
            }

            if (this.modelTargetWidget) {
                const value = data.model.replaceAll("/", "\\");
                if (value && this.modelTargetWidget.options.values.includes(value)) {
                    this.modelTargetWidget.value = value;
                }
            }
            this.setDirtyCanvas(true);
        }


    },
};

app.registerExtension(extension);

