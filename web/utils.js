import { api } from "../../scripts/api.js";

const author = "jupo";
const packageName = "PromptPreset";

export function mk_name(name) {
    return `${author}.${packageName}.${name}`;
}

export function mk_endpoint(url) {
    return `/${author}/${packageName}/${url}`;
}

export async function api_get(url) {
    const res = await api.fetchApi(mk_endpoint(url));
    const result = await res.json();
    return result;
}

export async function api_post(url, options = {}) {
    const body = {
        method: "POST", 
        body: JSON.stringify(options)
    };
    const res = await api.fetchApi(mk_endpoint(url), body);
    const result = await res.json();
    return result;
}

export function loadCSS(path, options = {}) {
    try {
        const { preventDuplicates = true, onLoad, onError } = options;
    
        const normalizedPath = path.endsWith('.js') 
            ? path.replace(/\.js$/, '.css') 
            : path;
        
        const resolveUrl = (relativePath) => {
            try {
                return new URL(relativePath, import.meta.url).toString();
            } catch (error) {
                console.warn(`Invalid URL: ${relativePath}`, error);
                return relativePath;
            }
        };
        
        const href = normalizedPath.startsWith('http') 
            ? normalizedPath 
            : resolveUrl(normalizedPath);
        
        if (preventDuplicates) {
            const existingLink = document.querySelector(`link[rel="stylesheet"][href="${href}"]`);
            if (existingLink) {
                return existingLink;
            }
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = href;
        
        if (onLoad) {
            link.addEventListener('load', onLoad);
        }
        
        if (onError) {
            link.addEventListener('error', onError);
        }
        
        document.head.appendChild(link);

        return link;

    } catch (error) {
        console.error("Failed to load css: ", error);
    }
}
