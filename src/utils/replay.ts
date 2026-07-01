import { readFile, readDir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

import { uploadReplay, checkReplayHashes } from "../services/game";
import { hashSHA256 } from "./common";

// Chave única para o localStorage
const STORAGE_KEY = "uploaded_replay_hashes";

// Mudou para síncrono, já que localStorage não precisa de await
function loadHashes(): Set<string> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (err) {
        console.error("Erro ao carregar hashes do localStorage:", err);
        return new Set();
    }
}

function saveHashes(hashes: Set<string>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...hashes]));
    } catch (err) {
        console.error("Erro ao salvar hashes no localStorage:", err);
    }
}

export async function syncReplays(basePath: string) {
    const replayDir = await join(basePath, "replay");

    if (!(await exists(replayDir))) return;

    const files = await readDir(replayDir);

    const valid = files.filter(f => {
        const name = f.name || "";

        if (name.startsWith("_LastReplay")) return false;
        if (!name.endsWith(".yrpX")) return false;

        return true;
    });

    if (valid.length === 0) return;

    // Carrega direto do browser/webview de forma síncrona
    const localHashes = loadHashes();

    const candidates: {
        name: string;
        buffer: Uint8Array;
        hash: string;
    }[] = [];

    for (const f of valid) {
        const filePath = await join(replayDir, f.name!);
        const buffer = await readFile(filePath);

        const hash = await hashSHA256(buffer);

        // if (localHashes.has(hash)) continue;

        candidates.push({
            name: f.name!,
            buffer,
            hash,
        });
    }

    if (candidates.length === 0) return;

    const res = await checkReplayHashes(candidates.map(c => c.hash));

    const existing = new Set(res.existing);

    existing.forEach(h => localHashes.add(h));

    const toUpload = candidates.filter(c => !existing.has(c.hash));

    for (const item of toUpload) {
        try {
            const file = new File([item.buffer.buffer as ArrayBuffer], item.name);

            await uploadReplay(file);

            localHashes.add(item.hash);
        } catch (err) {
            console.error("Erro upload:", item.name, err);
        }
    }

    // Salva o estado atualizado no localStorage
    saveHashes(localHashes);
}