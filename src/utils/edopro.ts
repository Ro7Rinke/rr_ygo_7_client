import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export async function isEdoproRunning(): Promise<boolean> {
  return await invoke('edopro_is_running') as boolean;
}

export async function startEdopro(path: string, args?: string[]): Promise<number> {
  return await invoke('edopro_start', { path, args: args ?? null }) as number;
}

export async function stopAllEdopro(): Promise<string> {
  return await invoke('edopro_stop_all') as string;
}

export async function restartEdopro(path: string, args?: string[]): Promise<number> {
  return await invoke('edopro_restart', { path, args: args ?? null }) as number;
}

export function onEdoproStateChanged(cb: (running: boolean) => void) {
  return listen<boolean>('edopro-state-changed', event => {
    cb(event.payload);
  });
}

export function makeAppBundlePath(folderPath: string, appBundleName = "EDOPro.app") {
  const normalized = folderPath.replace(/[\\/]+$/, "");
  return `${normalized}/${appBundleName}`;
}