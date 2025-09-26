import { api_get, api_post } from "./utils.js";

export async function get_config(key) {
    const value = await api_get(`get_config/${key}`);
    return value;
}

export async function set_config(key, value) {
    const body = {value: value};
    await api_post(`set_config/${key}`, body);
}

