import { $el } from "../../../../scripts/ui.js";


// ==============================================
// ファイル検索機能
// ==============================================
export class FileSearchManager {
    constructor(parent) {
        this.parent = parent;
        this.element = null;

        this.searchTerm = "";
        this.searchResults = [];
        this.isSearching = false;

        this.dirsVisibleBackup = null;
        this.filesVisibleBackup = null;

        this.createUI();
    }

    // ------------------------------------------
    // UI作成
    // ------------------------------------------
    createUI() {
        this.element = $el("div.jupo-preset-explorer-search");

        this.searchInput = $el("input", {
            type: "text", 
            placeholder: "ファイル名 / 表示名 で検索..."
        });

        this.clearButton = $el("button", {
            textContent: "クリア", 
            style: { display: "none" }
        });

        this.searchInput.addEventListener("input", async (e) => await this.handleSearch(e.target.value));
        this.searchInput.addEventListener("keydown", async (e) => {
            if (e.key === "Escape") await this.clearSearch();
        });
        this.clearButton.addEventListener("click", async () => await this.clearSearch());
        
        this.element.append(
            this.searchInput, 
            this.clearButton, 
        );

        this.results = $el("div.jupo-preset-explorer-view-search");
        this.searchResultsText = $el("span.label-search", { textContent: "🔍 検索"});

        this.resultsContainer = $el("div.search", [
            $el("div.label", [this.searchResultsText]), 
            this.results
        ]);
        this.resultsContainer.style.display = "none";
    }

    
    // ------------------------------------------
    // ハンドラー
    // ------------------------------------------
    async handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim().toLowerCase();
        if (this.searchTerm === "") {
            this.clearSearch();
            return;
        }

        this.isSearching = true;
        await this.performSearch();
        await this.updateSearchUI();
    }

    async performSearch() {
        this.searchResults = [];
        if (!this.searchTerm || !this.parent.fileData) return;

        // ツリーを再帰的に探索するための内部関数
        const traverse = (node) => {
            if (node.type === "file") {
                const fullPathMatch = node.fullPath && node.fullPath.toLowerCase().includes(this.searchTerm);
                const displayNameMatch = node.displayName && node.displayName.toLowerCase().includes(this.searchTerm);

                if (fullPathMatch || displayNameMatch) {
                    this.searchResults.push(node);
                }
            }

            if (node.type === "dir" && node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        };

        if (this.parent.fileData.children) {
            for (const child of this.parent.fileData.children) {
                traverse(child);
            }
        }
        
        await this.displaySearchResults();
    }


    // ------------------------------------------
    // 検索結果表示
    // ------------------------------------------
    async displaySearchResults() {
        this.results.replaceChildren();
        const groupedResults = this.groupResultsByDirectory();
        
        for (const [dirPath, files] of Object.entries(groupedResults)) {
            const dirHeader = $el("div.jupo-preset-explorer-view-search-header", {
                textContent: `📁 ${dirPath === "." ? "(root)" : dirPath}`
            });

            const container = $el("div.jupo-preset-explorer-view-search-item-container");
            for (const file of files) {
                const item = this.parent.renderer.createFileItem(file, () => this.parent.onFileClicked(file));
                container.append(item);
                await this.parent.renderer.loadMedia(item, file);
            }
            this.results.append(dirHeader, container);
        }
    }

    groupResultsByDirectory() {
        const grouped = {};
        this.searchResults.forEach(result => {
            const dirPath = this.parent.getDirPath(result.fullPath);
            if (!grouped[dirPath]) {
                grouped[dirPath] = [];
            }
            grouped[dirPath].push(result);
        });
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === ".") return -1;
            if (b === ".") return 1;
            return a.localeCompare(b);
        });
        const sortedGrouped = {};
        sortedKeys.forEach(key => {
            sortedGrouped[key] = grouped[key].sort((a, b) => a.name.localeCompare(b.name));
        });
        return sortedGrouped;
    }

    
    // ------------------------------------------
    // 検索UI更新
    // ------------------------------------------
    async updateSearchUI() {
        if (this.isSearching) {
            this.clearButton.style.display = "inline-block";
            this.searchResultsText.textContent = `🔍 検索 ${this.searchResults.length}件`;

            this.parent.treeContainer.style.opacity = "0.5";
            this.parent.treeContainer.style.pointerEvents = "none";

            this.parent.toggleDirs(false);
            this.parent.toggleFiles(false);
            this.resultsContainer.style.display = "block";

        } else {
            this.clearButton.style.display = "none";
            this.searchResultsText.textContent = "";

            this.parent.treeContainer.style.opacity = "1";
            this.parent.treeContainer.style.pointerEvents = "auto";

            await this.parent.restoreDirsVisible();
            this.parent.toggleFiles(true);
            this.resultsContainer.style.display = "none";
        }
    }

    // ------------------------------------------
    // 検索クリア
    // ------------------------------------------
    async clearSearch() {
        this.searchTerm = "";
        this.searchResults = [];
        this.isSearching = false;
        this.searchInput.value = "";

        await this.updateSearchUI();
        
        this.parent.openDir(this.parent.currentDir);
    }


    // ------------------------------------------
    // 更新
    // ------------------------------------------
    async refresh() {
        await this.handleSearch(this.searchTerm);
    }

}