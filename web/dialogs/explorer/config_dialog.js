import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";
import { get_config, set_config } from "../../config.js";

loadCSS("dialogs/explorer/css/config_dialog.css");

const DEFAULT_Z_INDEX = 2000;

export class ConfigDialog {
    constructor(parent) {
        this.parent = parent;
        this.overlay = null;
        
        this.createBaseUI();
    }


    // ------------------------------------------
    // 基本UI作成
    // ------------------------------------------
    createBaseUI() {
        this.overlay = $el("div.jupo-preset-explorer-config-overlay");
        this.overlay.addEventListener("mousedown", (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        this.content = $el("div.jupo-preset-explorer-config");
        this.overlay.append(this.content);
    }

    createConfigItem(name, element) {
        const item = $el("div.jupo-preset-explorer-config-item");
        const label = $el("div.jupo-preset-explorer-config-item-label", { textContent: name });
        item.append(label, element);

        return item;
    }


    // ------------------------------------------
    // 各UI作成関数
    // ------------------------------------------
    async createNumber(config) {
        let value = await get_config(config.id) ?? config.defaultValue;

        const slider = $el("input", {
            type: "range", 
            min: config.option.min ?? 0, 
            max: config.option.max ?? 1, 
            step: config.option.step ?? 0.1, 
            value: value ?? 0, 
        });

        const label = $el("label", { textContent: String(value) });

        const onChange = async function(v) {
            label.textContent = String(v);
            await set_config(config.id, v);
            config.onChange?.(v);
        }

        const leftButton = $el("button", [$el("i.mdi.mdi-chevron-left")]);
        leftButton.addEventListener("click", async () => {
            let newValue = parseFloat(slider.value) - parseFloat(slider.step);
            if (newValue < parseFloat(slider.min)) {
                newValue = parseFloat(slider.min);
            }
            slider.value = newValue;
            await onChange(slider.value);
        });

        const rightButton = $el("button", [$el("i.mdi.mdi-chevron-right")]);
        rightButton.addEventListener("click", async () => {
            let newValue = parseFloat(slider.value) + parseFloat(slider.step);
            if (newValue > parseFloat(slider.max)) {
                newValue = parseFloat(slider.max);
            }
            slider.value = newValue;
            await onChange(slider.value);
        });

        slider.addEventListener("input", async () => {
            await onChange(slider.value)
        });

        const element = $el("div.jupo-preset-explorer-config-item-slider", [leftButton, slider, rightButton, label]);
        
        const item = this.createConfigItem(config.name, element);
        return item;
    }

    async createBoolean(config) {
        let value = await get_config(config.id) ?? config.defaultValue;

        const input = $el("input.jupo-preset-explorer-config-item-toggle-input", { type: "checkbox" });
        input.checked = !!value;
        input.addEventListener("change", async () => {
            const newValue = input.checked;
            await set_config(config.id, newValue);
            config.onChange?.(newValue);
        });

        const toggle = $el("label.jupo-preset-explorer-config-item-toggle-switch", [
            input, 
            $el("span.jupo-preset-explorer-config-item-toggle-slider")
        ]);
        const element = $el("div.jupo-preset-explorer-config-item-toggle", [toggle]);
        
        const item = this.createConfigItem(config.name, element);
        return item;
    }


    // ------------------------------------------
    // ユーティリティ
    // ------------------------------------------
    setContentPosition(pos) {
        // マウス座標
        const mouseX = pos.x;
        const mouseY = pos.y;

        // 要素のサイズ
        const rect =this.content.getBoundingClientRect();

        const contentWidth = rect.width;
        const contentHeight = rect.height;

        // 画面サイズ
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 初期位置
        let left = mouseX - (contentWidth / 2);
        let top  = mouseY + 8;

        // 右にはみ出しそうなら左に寄せる
        if (left + contentWidth > viewportWidth) {
            left = viewportWidth - contentWidth;
        }

        // 下にはみ出しそうなら上に寄せる
        if (top + contentHeight > viewportHeight) {
            top = viewportHeight - contentHeight;
        }

        this.content.style.left = `${left}px`;
        this.content.style.top = `${top}px`;
    }



    // ------------------------------------------
    // 開く / 閉じる
    // ------------------------------------------
    async show(configs, pos) {
        // 各コンフィグのUIを作成
        for (const config of configs) {
            let item;
            switch (config.type) {
                case "number":
                    item = await this.createNumber(config);
                    break;
                
                case "boolean":
                    item = await this.createBoolean(config);
                    break;
                
                default:
                    console.warn(`unexpected config.type: ${config.type}`);
            }
            if (item) {
                this.content.append(item);
            }
        }

        // z-index設定
        const zIndex = this.parent.element.style.zIndex || DEFAULT_Z_INDEX;
        this.overlay.style.zIndex = zIndex + 1;

        // 表示
        document.body.append(this.overlay);

        // this.contentがはみ出さない位置を設定
        this.setContentPosition(pos);
    }

    close() {
        this.overlay?.remove();
    }
}