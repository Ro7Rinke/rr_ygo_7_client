import { invoke } from '@tauri-apps/api/core';

export type TunnelState =
  | 'running'
  | 'not_running'
  | 'stale_pid'
  | 'already_running'
  | 'started'
  | 'stopped'
  | 'exists'
  | 'downloaded';

export async function ensureBinary(): Promise<TunnelState> {
  return (await invoke<string>('ensure_binary')) as TunnelState;
}

export async function startTunnel(): Promise<TunnelState> {
  return (await invoke<string>('start_tunnel')) as TunnelState;
}

export async function stopTunnel(): Promise<TunnelState> {
  return (await invoke<string>('stop_tunnel')) as TunnelState;
}

export async function tunnelStatus(): Promise<TunnelState> {
  return (await invoke<string>('tunnel_status')) as TunnelState;
}
