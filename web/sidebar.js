import { app } from "../../scripts/app.js";
import { mk_name } from "./utils.js";
import { Chooser } from "./ui.js";

let currentPath;

app.extensionManager.registerSidebarTab({
    id: mk_name("PromptPreset"), 
    icon: "mdi mdi-tag-heart", 
    title: "Prompt Preset", 
    tooltip: "Prompt Preset", 
    type: "custom", 
    render: async (el) => {
        await Chooser.showSidebar(currentPath, el, 
            (fileNode) => {
                // ワークフローからPromptRecieverを取得
                const revievers = app.graph.nodes.filter(node => node.comfyClass === mk_name("Prompt_Reciever"));
                for (const node of revievers) {
                    node.applyData(fileNode);
                }
            }, 
            (path) => {
                currentPath = path;
            }
        );
    }
})