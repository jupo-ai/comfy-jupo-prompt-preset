import { $el } from "../../../../scripts/ui.js";
import { loadCSS, api_get, api_post } from "../../utils.js";
import { get_config } from "../../config.js";
import { ConfigDialog } from "./config_dialog.js";
import { FileSearchManager } from "./search_manager.js";
import { FileRenderManager } from "./render_manager.js";
import { EditorDialog } from "./editor_dialog.js";

loadCSS("dialogs/explorer/css/base_explorer.css");

export class BasePresetExplorer {
    constructor(fileList) {
        // UI要素
        this.element = null;
        this.toolbar = null;
        this.content = null;

        // データ
        this.fileData = null;

        // コンフィグ
        this.config = [];

        // 開いているディレクトリを保持
        this.currentDir = null;

        this.#initializeManagers();
        this.#createBaseUI();
        this.setupConfig();
        this.setupFileData(fileList);

        this.createUI();
    }

    // ------------------------------------------
    // マネージャー初期化
    // ------------------------------------------
    #initializeManagers() {
        this.searchManager = new FileSearchManager(this);
        this.renderer = new FileRenderManager(this);
    }


    // ------------------------------------------
    // コンフィグ設定
    // ------------------------------------------
    setupConfig() {
        // 継承クラスでオーバーライド
    }

    addConfig({ id, name, type, defaultValue, option, onChange }) {
        const config = {
            id: id, 
            name: name, 
            type: type, 
            defaultValue: defaultValue, 
            option: option, 
            onChange: onChange
        };
        this.config.push(config);
    }

    async applyConfig() {
        // 初回表示用
        // configの設定があればcallback呼び出し
        for (const config of this.config) {
            let value = await get_config(config.id);
            if (value === undefined || value === null) {
                value = config.defaultValue
            }
            config.onChange?.(value);
        }
    }


    // ------------------------------------------
    // ファイルデータ作成
    // ------------------------------------------
    setupFileData(fileList) {
        if (!fileList) return;

        // ルートノードのfullPathは空文字列
        const root = { name: ".", type: "dir", children: [], fullPath: "" };

        for (const data of fileList) {
            if (!data.path) continue;

            const path = data.path.replace(/\\/g, "/");
            const parts = path.split("/");
            let currentNode = root;
            let currentPath = "";

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;

                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (isFile) {
                    // ファイルノードを追加
                    currentNode.children.push({
                        name: part,
                        displayName: data.name,
                        type: "file",
                        fullPath: currentPath,

                        // 追加
                        desc: data.desc, 
                        note: data.note, 
                        positive: data.positive, 
                        negative: data.negative, 
                        mode: data.mode, 
                        model: data.model
                    });
                } else {
                    // ディレクトリノードを探すか作成
                    let nextNode = currentNode.children.find(
                        (child) => child.type === "dir" && child.name === part
                    );
                    if (!nextNode) {
                        nextNode = {
                            name: part,
                            type: "dir",
                            children: [],
                            fullPath: currentPath,
                        };
                        currentNode.children.push(nextNode);
                    }
                    currentNode = nextNode;
                }
            }
        }
        this.fileData = root;
    }


    // ------------------------------------------
    // UI作成
    // ------------------------------------------
    #createBaseUI() {
        this.element = $el("div.jupo-preset-explorer");

        // ツールバー
        this.toolbar = $el("div.jupo-preset-explorer-toolbar");
        this.addToolbarButton({
            icon: "mdi mdi-close", 
            title: "閉じる",
            onclick: () => this.close()
        });
        this.addToolbarButton({
            icon: "mdi mdi-refresh", 
            title: "更新", 
            onclick: async () => await this.refresh()
        });
        this.addToolbarButton({
            icon: "mdi mdi-cog", 
            title: "設定", 
            onclick: (e) => this.showConfig(e)
        });
        this.addToolbarButton({
            icon: "mdi mdi-folder", 
            title: "プリセットフォルダを開く", 
            onclick: async () => await this.openPresetFolder()
        })

        this.content = $el("div.jupo-preset-explorer-content");
        this.element.append(this.toolbar, this.content);
    }

    createUI() {
        this.createHeader();
        this.createDataContainers();
        this.buildTree(this.fileData, this.treeContainer);
    }

    createHeader() {
        const header = $el("div.jupo-preset-explorer-header");
        const headerTitle = $el("span", {
            textContent: "Prompt Preset"
        });
        const featuresContainer = $el("div.jupo-preset-explorer-header-features");
        featuresContainer.append(
            this.searchManager.element, 
        );
        header.append(headerTitle, featuresContainer);
        this.content.append(header)
    }

    createDataContainers() {
        this.dataContainer = $el("div.jupo-preset-explorer-data-area");

        this.treeContainer = $el("div.jupo-preset-explorer-tree");

        this.dirs = $el("div.jupo-preset-explorer-view-dirs");
        this.files = $el("div.jupo-preset-explorer-view-files");
        this.viewContainer = $el("div.jupo-preset-explorer-view", [
            $el("div.dirs", [
                $el("div.label", [$el("span.label-dirs", { textContent: "📁 フォルダー"})]), 
                this.dirs
            ]), 
            $el("div.files", [
                $el("div.label", [$el("span.label-files", { textContent: "📄 ファイル"})]), 
                this.files
            ]), 
            this.searchManager.resultsContainer
        ]);
        
        this.dataContainer.append(this.treeContainer, this.viewContainer);
        this.content.append(this.dataContainer);
    }

    buildTree(node, parentElement, currentPath = null) {
        // 初回呼び出し時（ルート）の処理
        if (!currentPath) {
            const rootUl = $el("ul");
            const summary = $el("summary.jupo-preset-explorer-tree-summary", [
                $el("span", { textContent: `📁 (root)`})
            ]);
            summary.setAttribute("data-dir-path", ".");
            summary.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await this.onTreeClicked(summary, node);
            });
            const details = $el("details.jupo-preset-explorer-tree-details", { open: true }, [summary]);
            const rootLi = $el("li", [details]);
            rootUl.append(rootLi);

            // (root) の下に第一階層のツリーを構築するためのコンテナ
            const subTreeContainer = $el("div.jupo-preset-explorer-subtree");
            // サブツリー構築のために再帰呼び出し
            this.buildTree(node, subTreeContainer, ".");
            
            // サブツリーに中身がある場合のみコンテナを追加
            if (subTreeContainer.hasChildNodes()) {
                details.append(subTreeContainer);
            }

            parentElement.append(rootUl);
            return;
        }

        // サブツリー構築の処理 (currentPath が null でない場合)
        const subUl = $el("ul");
        for (const dir of this.getSubDirs(node)) {
            const newPath = currentPath === "." ? dir.name : `${currentPath}/${dir.name}`;
            const hasSub = this.getSubDirs(dir).length > 0;

            const summary = $el("summary.jupo-preset-explorer-tree-summary", [
                $el("span", { textContent: `📁 ${dir.name}`})
            ]);
            summary.setAttribute("data-dir-path", newPath);
            summary.addEventListener("click", async (e) => {
                e.stopPropagation();
                await this.onTreeClicked(summary, dir);
            });
            const details = $el("details.jupo-preset-explorer-tree-details", [summary]);
            const li = $el("li", [details]);

            if (hasSub) {
                summary.classList.add("has-sub");
                const subTreeContainer = $el("div.jupo-preset-explorer-subtree");
                this.buildTree(dir, subTreeContainer, newPath);
                details.append(subTreeContainer);
            }
            
            subUl.append(li);
        }
        
        // 生成されたサブツリー(ul)に中身がある場合のみ親要素に追加
        if (subUl.hasChildNodes()) {
            parentElement.append(subUl);
        }
    }

    async onTreeClicked(summary, node) {
        if (!this.searchManager.isSearching) {
            this.setActiveDir(summary);
            await this.displayData(node)
            this.currentDir = node.fullPath;
        }
    }

    setActiveDir(element) {
        this.treeContainer.querySelectorAll(".active-dir")
            .forEach(el => el.classList.remove("active-dir"));
        element.classList.add("active-dir");
    }

    async displayData(node) {
        if (this.searchManager.isSearching) return;
        if (node.type !== "dir") return;

        await this.displayDirs(node);
        await this.displayFiles(node);
    }

    async displayDirs(node) {
        this.dirs.replaceChildren();
        const dirs = node.children.filter(c => c.type === "dir");

        await this.restoreDirsVisible();
        if ((node.name === "." && dirs.length === 0)) {
            this.toggleDirs(false);
        }
        
        // ラベル
        const dirPath = node.fullPath || "(root)";
        this.labelDirPath(dirPath);

        // 親階層
        if (node.name !== ".") {
            const currentPath = node.fullPath;
            const lastSlash = currentPath.lastIndexOf("/");
            const parentPath = currentPath.substring(0, lastSlash);
            
            const parentItem = this.renderer.createDirItem("..", () => this.openDir(parentPath));
            this.dirs.append(parentItem);
        }

        // サブディレクトリ
        for (const dir of dirs) {
            const item = this.renderer.createDirItem(dir.name, () => this.openDir(dir.fullPath));
            this.dirs.append(item);
        }
    }

    async displayFiles(node) {
        this.files.replaceChildren();
        const files = node.children.filter(c => c.type === "file");

        // 新規作成
        const newFileItem = this.renderer.createNewFileItem(async () => await this.onNewFileClicked(node));
        this.files.append(newFileItem);

        for (const file of files) {
            const item = this.renderer.createFileItem(file, () => this.onFileClicked(file));
            this.files.append(item);
            await this.renderer.loadMedia(item, file);
        }
    }

    labelDirPath(dirPath) {
        // ラベルにパスを表示
        const label = this.viewContainer.querySelector("span.label-dirs");
        if (label) {
            label.textContent = `📁 ${dirPath}`;
        }
    }


    // ------------------------------------------
    // ディレクトリを開く
    // ------------------------------------------
    openDir(dirPath) {
        if (!dirPath) dirPath = ".";

        let currentPath;
        let lastSumamry;
        const parts = dirPath.split("/");
        for (const part of parts) {
            const path = currentPath ? `${currentPath}/${part}` : part;
            const selector = `.jupo-preset-explorer-tree-summary[data-dir-path="${path}"]`;
            const summary = this.treeContainer.querySelector(selector);
            if (summary) {
                const details = summary.parentElement;
                details.open = true;
                lastSumamry = summary;
            }
            currentPath = path;
        }
        if (lastSumamry) {
            lastSumamry.click();
            lastSumamry.parentElement.open = true;
        } else {
            // フォルダが見つからない場合はルートを開く
            this.openDir();
        }
    }


    // ------------------------------------------
    // 新規作成コールバック
    // ------------------------------------------
    async onNewFileClicked(dirNode) {
        const dialog = new EditorDialog(this, dirNode);
        await dialog.show();
    }


    // ------------------------------------------
    // ファイルクリック時コールバック
    // ------------------------------------------
    onFileClicked(fileNode) {
        // 継承クラスでオーバーライド
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

    getSubDirs(node) {
        const subDirs = node.children
            .filter(child => child.type === "dir")
            .sort((a, b) => a.name.localeCompare(b.name));
        return subDirs;
    }

    getDirPath(path) {
        if (!path) return ".";

        if (path.includes(".")) {
            // ファイルの場合
            return path.substring(0, path.lastIndexOf("/")) || ".";
        } else {
            // フォルダの場合
            return path;
        }
    }

    toggleTree(enable) {
        const display = enable ? "block" : "none";
        if (this.treeContainer) {
            this.treeContainer.style.display = display;
        }
    }

    toggleDirs(enable) {
        const display = enable ? "block" : "none";
        const dirs = this.viewContainer.querySelector("div.dirs");
        if (dirs) {
            dirs.style.display = display;
        }
    }

    toggleFiles(enable) {
        const display = enable ? "block" : "none";
        const files = this.viewContainer.querySelector("div.files");
        if (files) {
            files.style.display = display;
        }
    }

    isTreeVisible() {
        const display = this.treeContainer.style.display;
        return display !== "none";
    }

    isDirsVisible() {
        const dirs = this.viewContainer.querySelector("div.dirs");
        if (!dirs) return false;

        const visible = dirs.style.display;
        return visible !== "none";
    }

    isFilesVisible() {
        const files = this.viewContainer.querySelector("div.files");
        if (!files) return false;

        const visible = files.style.display;
        return visible !== "none";
    }

    async restoreDirsVisible() {}     // コンフィグから設定を戻す(継承クラスでオーバーライド)


    // ------------------------------------------
    // 表示 / 閉じる
    // ------------------------------------------
    async show(currentPath) {
        await this.applyConfig();
        const dirPath = this.getDirPath(currentPath);
        this.openDir(dirPath);
    }

    close() {
        // 継承クラスでオーバーライド
    }

    async showConfig(e) {
        const pos = {x: e.clientX, y: e.clientY};
        const config = new ConfigDialog(this)
        await config.show(this.config, pos);
    }

    async openPresetFolder() {
        await api_post("open_preset_folder");
    }


    // ------------------------------------------
    // 更新
    // ------------------------------------------
    async refresh() {
        const fileList = await api_get("get_files");
        this.setupFileData(fileList);

        // ディレクトリツリー再生成
        this.treeContainer.replaceChildren();
        this.buildTree(this.fileData, this.treeContainer);

        // 現在のフォルダを開く
        this.openDir(this.currentDir);

        if (this.searchManager.isSearching) {
            await this.searchManager.refresh();
        }
    }
}