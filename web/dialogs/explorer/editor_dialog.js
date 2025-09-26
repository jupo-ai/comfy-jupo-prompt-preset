import { $el } from "../../../../scripts/ui.js";
import { api_get, api_post, loadCSS } from "../../utils.js";
import { PreviewSection } from "./editor_preview_section.js";

loadCSS("dialogs/explorer/css/editor_dialog.css");
const DEFAULT_Z_INDEX = 2000;


export class EditorDialog {
    constructor(explorer, node, savedCallback) {
        this.explorer = explorer;
        this.node = node;
        this.savedCallback = savedCallback;
        this.newFileMode = node.type === "dir";

        // UI
        this.overlay = null;
        this.headerTitle = null;
        this.toolbar = null;
        this.content = null;

        this.createUI();
    }

    // ------------------------------------------
    // UI作成
    // ------------------------------------------
    createUI() {
        this.overlay = $el("div.jupo-preset-editor-overlay");
        this.overlay.addEventListener("mousedown", (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
        this.content = $el("div.jupo-preset-editor-content");
        this.overlay.append(this.content);

        this.createToolbar();
        this.createHeader();
        this.createBody();
        this.createFooter();
    }

    // --- ツールバー ---
    createToolbar() {
        this.toolbar = $el("div.jupo-preset-editor-toolbar");
        this.addToolbarButton({
            icon: "mdi mdi-close", 
            title: "閉じる", 
            onclick: () => this.close(), 
        });
        this.content.append(this.toolbar);
    }

    // --- ヘッダー ---
    createHeader() {
        const header = $el("div.jupo-preset-editor-header");
        const headerTitle = $el("span", {
            textContent: this.newFileMode ? "新規作成" : this.node.fullPath
        });
        header.append(headerTitle);
        this.content.append(header);
    }

    // --- メインボディ ---
    createBody() {
        this.body = $el("div.jupo-preset-editor-body");
        this.dataArea = $el("div.jupo-preset-editor-data-area");
        this.mediaArea = $el("div.jupo-preset-editor-media-area");
        this.body.append(this.dataArea, this.mediaArea);
        this.content.append(this.body);

        this.createDataArea();
        this.createMediaArea();
    }

    // --- データエリア ---
    createDataArea() {
        // 表示名
        this.dataName = $el("input", { type: "text", autocomplete: "off" });
        const name = $el("div.jupo-preset-editor-data-item", [
            $el("label", { textContent: "名前" }), 
            this.dataName
        ]);
        this.dataArea.append(name);

        // ファイルパス
        this.dataPath = $el("input", { type: "text", autocomplete: "off" });
        const filePath = $el("div.jupo-preset-editor-data-item", [
            $el("label", { textContent: "ファイルパス" }), 
            this.dataPath
        ]);
        this.dataArea.append(filePath);

        // 説明
        this.dataDesc = $el("textarea", { autocomplete: "off" });
        const description = $el("div.jupo-preset-editor-data-item", [
            $el("label", { textContent: "説明" }), 
            this.dataDesc
        ]);
        this.dataArea.append(description);

        // モデル(実際のパスリストは表示時に設定)
        this.dataModel = this.createPathDropdown();
        const model = $el("div.jupo-preset-editor-data-item", [
            $el("label", { textContent: "チェックポイント" }), 
            this.dataModel
        ]);
        this.dataArea.append(model);

        // ポジティブプロンプト
        this.dataPositive = $el("textarea", { autocomplete: "off" });
        const positive = $el("div.jupo-preset-editor-data-item.prompt", [
            $el("label", { textContent: "ポジティブプロンプト" }), 
            this.dataPositive
        ]);
        this.dataArea.append(positive);

        // ネガティブプロンプト
        this.dataNegative = $el("textarea", { autocomplete: "off" });
        const negative = $el("div.jupo-preset-editor-data-item.prompt", [
            $el("label", { textContent: "ネガティブプロンプト" }), 
            this.dataNegative
        ]);
        this.dataArea.append(negative);

        // 備考
        this.dataNote = $el("textarea", { autocomplete: "off" });
        const note = $el("div.jupo-preset-editor-data-item", [
            $el("label", { textContent: "備考" }), 
            this.dataNote
        ]);
        this.dataArea.append(note);

        // モード
        this.dataMode = this.createPathDropdown(["append", "overwrite"], false);
        const mode = $el("div.jupo-preset-editor-data-item", [
            $el("label", { textContent: "モード" }), 
            this.dataMode
        ]);
        this.dataArea.append(mode);

    }

    createPathDropdown(initialFiles = [], showPlaceholder = true) {
        const container = $el("div.jupo-preset-editor-data-item-dropdown-container");
        const valueInput = $el("input", { type: "hidden" });
        let fileTree = {};

        /**
         * オプションノードから <select> 要素を生成します。
         * @param {object} node - fileTree のノード
         * @param {string} [selectedValue=""] - 事前に選択する値
         * @returns {HTMLSelectElement}
         */
        const createSelectElement = (node, selectedValue = "") => {
            const select = $el("select");

            if (showPlaceholder) {
                select.append($el("option", { textContent: "選択してください...", value: "" }));
            }

            const sortedKeys = Object.keys(node || {}).sort((a, b) => {
                const isADir = node[a] !== null;
                const isBDir = node[b] !== null;
                if (isADir && !isBDir) return -1;
                if (!isADir && isBDir) return 1;
                return a.localeCompare(b);
            });

            for (const key of sortedKeys) {
                const isDir = node[key] !== null;
                const option = $el("option", {
                    textContent: isDir ? `📁 ${key}` : key,
                    value: key,
                });
                option.dataset.isDir = String(isDir);
                select.append(option);
            }

            if (selectedValue) {
                select.value = selectedValue;
            }

            return select;
        };

        /**
         * 現在のドロップダウンの状態から完全なファイルパスを組み立て、hidden input の値を更新します。
         */
        const updateValue = () => {
            const parts = [];
            let isFileSelected = false;

            container.querySelectorAll('select').forEach(select => {
                const { value, selectedIndex } = select;
                if (value) {
                    parts.push(value);
                    const option = select.options[selectedIndex];
                    if (option && option.dataset.isDir === 'false') {
                        isFileSelected = true;
                    }
                }
            });

            // 最後の要素がファイルの場合のみ値を設定し、ディレクトリ選択中は値を空にします。
            valueInput.value = isFileSelected ? parts.join('/') : "";
        };

        /**
         * 指定されたパスに基づいてドロップダウンチェーン全体を再描画します。
         * @param {string} path - 設定するフルパス (例: "dir/subdir/file.txt")
         */
        const renderFromPath = (path) => {
            container.querySelectorAll("select").forEach(s => s.remove());
            
            const parts = path ? path.replace(/\\/g, "/").split("/") : [];
            let currentNode = fileTree;

            // パスの各部分に対応するドロップダウンを生成
            for (const part of parts) {
                if (!currentNode) break;

                const select = createSelectElement(currentNode, part);
                container.append(select);
                
                // 値が正しく設定できなかった（存在しないパスなど）場合は中断
                if (select.value !== part) {
                    currentNode = null;
                    break;
                }
                
                const isDir = select.options[select.selectedIndex]?.dataset.isDir === 'true';
                currentNode = isDir ? currentNode[part] : null;
            }

            // 最後のパスがディレクトリだった場合、その中身を選択するためのドロップダウンを追加
            if (currentNode && Object.keys(currentNode).length > 0) {
                container.append(createSelectElement(currentNode));
            }

            // ドロップダウンが一つも無い場合は、ルート階層を表示
            if (!container.querySelector('select') && Object.keys(fileTree).length > 0) {
                container.append(createSelectElement(fileTree));
            }

            // 最終的な値を更新
            updateValue();
        };

        /**
         * select 要素の変更イベントを処理します（イベントデリゲーション）。
         * @param {HTMLSelectElement} targetSelect - 変更が発生した select 要素
         */
        const onSelectChange = (targetSelect) => {
            // 変更されたドロップダウンより後のものを全て削除
            let nextEl = targetSelect.nextElementSibling;
            while (nextEl) {
                const toRemove = nextEl;
                nextEl = nextEl.nextElementSibling;
                toRemove.remove();
            }

            const selectedValue = targetSelect.value;
            const selectedOption = targetSelect.options[targetSelect.selectedIndex];
            
            // ディレクトリが選択された場合のみ、次の階層のドロップダウンを生成
            if (selectedValue && selectedOption?.dataset.isDir === 'true') {
                const pathParts = [];
                let currentSelect = container.querySelector('select');
                while(currentSelect) {
                    if(currentSelect.value) pathParts.push(currentSelect.value);
                    if (currentSelect === targetSelect) break;
                    currentSelect = currentSelect.nextElementSibling;
                }

                let subNode = fileTree;
                for (const part of pathParts) {
                    subNode = subNode?.[part];
                }

                if (subNode && Object.keys(subNode).length > 0) {
                    container.append(createSelectElement(subNode));
                }
            }
            
            updateValue();
        };


        // --- 初期化と公開APIの設定 ---

        container.append(valueInput);

        // イベントデリゲーションを使って、コンテナで効率的にイベントを管理
        container.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT') {
                onSelectChange(e.target);
            }
        });
        
        // `value` プロパティのセッターとゲッターを定義
        Object.defineProperty(container, "value", {
            get: () => valueInput.value,
            set: (val) => {
                renderFromPath(val);
            }
        });

        // ファイルリストを更新するメソッド
        container.updateOptions = (files = []) => {
            fileTree = this.buildFileTree(files);
            // 現在設定されている値で再描画を試みる
            renderFromPath(container.value); 

            // placeholderがなく、値も未設定の場合、最初のファイルをデフォルト値に設定
            if (!container.value && !showPlaceholder && files.length > 0) {
                container.value = files[0];
            }
        };

        // 初期化処理
        container.updateOptions(initialFiles);
        return container;
    }

    buildFileTree(files) {
        const root = {};
        for (const path of files) {
            const parts = path.replace(/\\/g, "/").split("/");
            let currentNode = root;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!part) continue;

                const isLastPart = i === parts.length - 1;

                if (currentNode[part] === undefined) {
                    currentNode[part] = isLastPart ? null : {};
                }
                if (!isLastPart && currentNode[part] === null) {
                    currentNode[part] = {};
                }
                currentNode = currentNode[part];
            }
        }
        return root;
    }

    // --- メディアエリア ---
    createMediaArea() {
        this.previewSection = new PreviewSection({
            node: this.node, 
            onUpload: async (file) => await this.onUploadPreview(file), 
            onDelete: async () => await this.onDeletePreview()
        });
        this.mediaArea.append(this.previewSection.element);
    }

    // --- フッター ---
    createFooter() {
        const footer = $el("div.jupo-preset-editor-footer");

        // 保存ボタン
        const saveButton = $el("button.save", [$el("i.mdi.mdi-content-save"), "保存"]);
        saveButton.addEventListener("click", async () => await this.onSave());

        // キャンセルボタン
        const cancelButton = $el("button.cancel", [$el("i.mdi.mdi-cancel"), "キャンセル"]);
        cancelButton.addEventListener("click", () => this.onCancel());

        footer.append(saveButton, cancelButton);
        this.content.append(footer);
    }


    // ------------------------------------------
    // データセットアップ
    // ------------------------------------------
    setupData() {
        this.setupName();
        this.setupPath();
        this.setupDesc();
        this.setupModel();
        this.setupPositive();
        this.setupNegative();
        this.setupNote();
        this.setupMode();
    }

    // --- 表示名 ---
    setupName() {
        const value = this.node.displayName || "";
        this.dataName.value = value;

        // 新規作成モードの場合、ハンドラを設定
        if (this.newFileMode) {
            this.dataName.addEventListener("input", () => this.onNameInput());
        }
    }

    // --- ファイルパス ---
    setupPath() {
        let value = this.node.fullPath || "";
        if (this.newFileMode) {
            if (value) {
                value += "/newFile.json";
            } else {
                value += "newFile.json";
            }
        }
        this.dataPath.value = value;

        // 既存ファイルの場合、変更不可
        if (!this.newFileMode) {
            this.dataPath.disabled = true;
            this.dataPath.style.opacity = "0.5";
        }
    }

    // --- 説明 ---
    setupDesc() {
        const value = this.node.desc || "";
        this.dataDesc.value = value;
    }

    // --- モデル名 ---
    setupModel() {
        const value = this.node.model || "";
        this.dataModel.value = value;
    }

    // --- ポジティブプロンプト ---
    setupPositive() {
        const value = this.node.positive || "";
        this.dataPositive.value = value;
    }

    // --- ネガティブプロンプト ---
    setupNegative() {
        const value = this.node.negative || "";
        this.dataNegative.value = value;
    }

    // --- 備考 ---
    setupNote() {
        const value = this.node.note || "";
        this.dataNote.value = value;
    }

    // --- モード ---
    setupMode() {
        let value = this.node.mode || "append";
        if (!["append", "overwrite"].includes(value)) {
            value = "append";
        }
        this.dataMode.value = value;
    }




    // ------------------------------------------
    // ハンドラ
    // ------------------------------------------
    async onSave() {
        if (this.validValue()) {
            const data = {
                "path": this.dataPath.value, 
                "name": this.dataName.value, 
                "desc": this.dataDesc.value, 
                "model": this.dataModel.value, 
                "positive": this.dataPositive.value, 
                "negative": this.dataNegative.value, 
                "note": this.dataNote.value, 
                "mode": this.dataMode.value
            };
            await api_post("save_file", { data: data });
            this.explorer?.refresh();
            this.savedCallback?.(data);
            this.close();
        }
    }

    validValue() {
        if (!this.dataPath.value) {
            alert("ファイルパスが空です");
            return false;
        }

        if (!this.dataPath.value.endsWith(".json")) {
            alert("不正な拡張子です [.json]");
            return false
        }

        if (!["append", "overwrite"].includes(this.dataMode.value)) {
            alert("不正なモードです, [ append / overwrite]");
            return false
        }

        const modelDropdowns = this.dataModel.querySelectorAll("select");
        if (modelDropdowns.length > 1 && modelDropdowns[modelDropdowns.length - 1].value === "") {
            alert("モデル選択が完了していません。ファイルを選択してください");
            return false;
        }

        return true;
    }

    onCancel() {
        this.close();
    }

    async onUploadPreview(file) {
        await api_post("save_as_preview", {
            file: file, 
            path: encodeURIComponent(this.node.fullPath)
        });
        await this.previewSection.display();
        await this.explorer?.refresh();
    }

    async onDeletePreview() {
        await api_post("delete_preview", {
            path: encodeURIComponent(this.node.fullPath)
        });
        await this.previewSection.display();
        await this.explorer?.refresh();
    }

    onNameInput() {
        let fullPath;
        if (this.node.fullPath) {
            fullPath = `${this.node.fullPath}/${this.dataName.value}.json`;
        } else {
            fullPath = `${this.dataName.value}.json`;
        }
        if (!this.dataName.value) {
            fullPath = ""; // リセット用
        }
        this.dataPath.value = fullPath;
    }


    // ------------------------------------------
    // ユーティリティ
    // ------------------------------------------
    addToolbarButton({ icon, title, onclick }) {
        if (!this.toolbar) return null;

        const button = $el("button");
        if (icon) {
            const iconEl = $el("i");
            const classes = icon.split(/\s+/);
            iconEl.classList.add(...classes);
            button.append(iconEl);
        }
        if (title) {
            button.title = title;
        }
        if (onclick) {
            button.onclick = onclick;
        }
        this.toolbar.prepend(button);
        return button;
    }

    getMaxIndex(className) {
        const elements = document.body.querySelectorAll(className);
        const zIndexes = Array.from(elements).map(element => {
            return parseInt(window.getComputedStyle(element).zIndex, 10) || 0;
        });

        return zIndexes.length > 0 ? Math.max(...zIndexes) : DEFAULT_Z_INDEX;
    }


    // ------------------------------------------
    // 開く / 閉じる
    // ------------------------------------------
    async show() {
        // プレビューメディア取得
        await this.previewSection.display()

        // データ適用
        const checkpoints = await api_get("get_checkpoints");
        this.dataModel.updateOptions(checkpoints);
        this.setupData();

        // 表示
        const zIndex = this.getMaxIndex(".jupo-preset-editor-overlay");
        this.overlay.style.zIndex = zIndex + 1;
        document.body.append(this.overlay);
    }

    close() {
        this.overlay?.remove();
    }
}