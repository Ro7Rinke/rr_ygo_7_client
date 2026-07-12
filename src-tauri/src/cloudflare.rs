// src-tauri/src/cloudflare.rs
use anyhow::{Context, Result};
use dirs_next::data_local_dir;
use std::{convert::TryFrom, fs, io::Write, path::PathBuf, process::Stdio};
use sysinfo::{ProcessExt, System, SystemExt};
use flate2::read::GzDecoder;
use tar::Archive;
use walkdir::WalkDir; 
use std::io::{BufRead, BufReader};
use std::thread;

const GAME_URL: &str = "rrygo7-pro-game.ro7rinke.com.br";
const LOCAL_PORT: &str = "7911";
const APP_DIR_NAME: &str = "RRYGO7";
const PID_FILE: &str = "cloudflared.pid";

fn exe_name_for_platform() -> &'static str {
  if cfg!(target_os = "windows") { "cloudflared.exe" } else { "cloudflared" }
}

fn download_url_for_platform() -> Result<&'static str> {
  let os = std::env::consts::OS;
  let arch = std::env::consts::ARCH;
  match (os, arch) {
    ("linux", "x86_64") => Ok("https://github.com/cloudflare/cloudflared/releases/download/2026.7.1/cloudflared-linux-amd64"),
    ("linux", "aarch64") => Ok("https://github.com/cloudflare/cloudflared/releases/download/2026.7.1/cloudflared-linux-arm"),
    ("macos", "aarch64") => Ok("https://github.com/cloudflare/cloudflared/releases/download/2026.7.1/cloudflared-darwin-arm64.tgz"),
    ("macos", "x86_64") => Ok("https://github.com/cloudflare/cloudflared/releases/download/2026.7.1/cloudflared-darwin-amd64.tgz"),
    ("windows", "x86_64") => Ok("https://github.com/cloudflare/cloudflared/releases/download/2026.7.1/cloudflared-windows-amd64.exe"),
    _ => Err(anyhow::anyhow!("unsupported platform: {} {}", os, arch)),
  }
}

fn app_bin_dir() -> Result<PathBuf> {
  let base = data_local_dir().ok_or_else(|| anyhow::anyhow!("could not determine data dir"))?;
  let dir = base.join(APP_DIR_NAME).join("cloudflared");
  fs::create_dir_all(&dir).context("creating bin dir")?;
  Ok(dir)
}

fn bin_path() -> Result<PathBuf> {
  Ok(app_bin_dir()?.join(exe_name_for_platform()))
}

fn pid_file_path() -> Result<PathBuf> {
  Ok(app_bin_dir()?.join(PID_FILE))
}

fn is_process_running_by_name(name_substr: &str) -> bool {
  let mut sys = System::new_all();
  sys.refresh_processes();
  sys.processes().values().any(|p| p.name().to_lowercase().contains(&name_substr.to_lowercase()))
}

fn read_pid_file(path: &PathBuf) -> Option<i32> {
  match fs::read_to_string(path) {
    Ok(s) => s.trim().parse::<i32>().ok(),
    Err(_) => None,
  }
}

/* -------------------------
   Implementações internas
   retornam anyhow::Result
   ------------------------- */

fn ensure_binary_impl() -> Result<String> {
  let bin = bin_path()?;
  if bin.exists() {
    return Ok("exists".into());
  }

  let url = download_url_for_platform()?;
  let mut resp = reqwest::blocking::get(url).context("download request failed")?;
  if !resp.status().is_success() {
    return Err(anyhow::anyhow!("failed to download cloudflared: HTTP {}", resp.status()));
  }

  // Se URL terminar com .tgz, extraia o tar.gz e mova o binário para `bin`
  if url.ends_with(".tgz") || url.ends_with(".tar.gz") {
    // leia todo o corpo em memória (pode trocar para stream se preferir)
    let bytes = resp.bytes().context("reading response bytes")?;
    let cursor = std::io::Cursor::new(bytes);
    let gz = flate2::read::GzDecoder::new(cursor);
    let mut archive = tar::Archive::new(gz);

    // extraia para um diretório temporário e mova o executável esperado
    let tmp_dir = app_bin_dir()?.join("tmp_extract");
    if tmp_dir.exists() {
      let _ = std::fs::remove_dir_all(&tmp_dir);
    }
    std::fs::create_dir_all(&tmp_dir)?;
    archive.unpack(&tmp_dir).context("unpack tarball")?;

    // procurar o executável dentro do tmp_dir (nome esperado)
    let exe_name = exe_name_for_platform();
    let mut found = None;
    for entry in walkdir::WalkDir::new(&tmp_dir).into_iter().filter_map(|e| e.ok()) {
      if let Some(name) = entry.path().file_name().and_then(|n| n.to_str()) {
        if name == exe_name || name == format!("cloudflared-{}", exe_name) {
          found = Some(entry.path().to_path_buf());
          break;
        }
      }
    }

    let found = found.ok_or_else(|| anyhow::anyhow!("extracted binary not found in archive"))?;
    std::fs::rename(&found, &bin).context("move extracted binary to bin path")?;
    // permissões
    #[cfg(unix)]
    {
      use std::os::unix::fs::PermissionsExt;
      let mut p = fs::metadata(&bin)?.permissions();
      p.set_mode(0o755);
      fs::set_permissions(&bin, p)?;
    }
  } else {
    // binário direto: grava no caminho final
    let mut out = fs::File::create(&bin).context("create bin file")?;
    std::io::copy(&mut resp, &mut out).context("write bin file")?;
    #[cfg(unix)]
    {
      use std::os::unix::fs::PermissionsExt;
      let mut p = fs::metadata(&bin)?.permissions();
      p.set_mode(0o755);
      fs::set_permissions(&bin, p)?;
    }
  }

  Ok("downloaded".into())
}


fn start_tunnel_impl() -> Result<String> {
  // garante binário
  let _ = ensure_binary_impl()?;

  // checagens de PID/processo e spawn
  let pid_path = pid_file_path()?;
  if let Some(pid_i32) = read_pid_file(&pid_path) {
    // converte i32 -> sysinfo::Pid via usize
    let pid_sys: sysinfo::Pid = (pid_i32 as usize).into();
    let mut sys = System::new_all();
    sys.refresh_processes();
    if sys.process(pid_sys).is_some() {
      return Ok("already_running".into());
    } else {
      let _ = fs::remove_file(&pid_path);
    }
  }

  if is_process_running_by_name("cloudflared") {
    return Ok("already_running".into());
  }

  let bin = bin_path()?;
  
	let mut cmd = std::process::Command::new(&bin);
	cmd.arg("access")
			.arg("tcp")
			.arg("--hostname")
			.arg(GAME_URL)
			.arg("--url")
			.arg(format!("127.0.0.1:{}", LOCAL_PORT))
			.arg("--loglevel")
			.arg("debug")
			.stdout(std::process::Stdio::piped())
			.stderr(std::process::Stdio::piped())
			.stdin(std::process::Stdio::null());

	// spawn
	let mut child = cmd.spawn().context("failed to spawn cloudflared")?;

	// grava PID
	let mut f = std::fs::File::create(&pid_path)?;
	write!(f, "{}", child.id())?;

	// prepare pipes
	let stdout = child.stdout.take();
	let stderr = child.stderr.take();

	// opcional: caminho do log no app data
	let log_path = app_bin_dir()?.join("cloudflared.log");
	let mut log_file = std::fs::OpenOptions::new().create(true).append(true).open(&log_path)?;

	// se você tem um app_handle disponível, clone para emitir eventos
	// let app_handle = app_handle.clone();

	if let Some(out) = stdout {
			let mut out_reader = BufReader::new(out);
			let mut log_file_clone = log_file.try_clone()?;
			// thread que imprime e grava
			thread::spawn(move || {
					let mut line = String::new();
					while let Ok(bytes) = out_reader.read_line(&mut line) {
							if bytes == 0 { break; }
							// imprime no terminal do tauri dev
							print!("[cloudflared stdout] {}", line);
							// grava no arquivo
							let _ = writeln!(log_file_clone, "[OUT] {}", line.trim_end());
							// opcional: emitir evento para frontend
							// let _ = app_handle.emit_all("cloudflared-log", line.clone());
							line.clear();
					}
			});
	}

	if let Some(err) = stderr {
			let mut err_reader = BufReader::new(err);
			let mut log_file_clone = log_file.try_clone()?;
			thread::spawn(move || {
					let mut line = String::new();
					while let Ok(bytes) = err_reader.read_line(&mut line) {
							if bytes == 0 { break; }
							eprint!("[cloudflared stderr] {}", line);
							let _ = writeln!(log_file_clone, "[ERR] {}", line.trim_end());
							// opcional: emitir evento para frontend
							// let _ = app_handle.emit_all("cloudflared-log", line.clone());
							line.clear();
					}
			});
	}

	// thread que detém o Child e espera o término (evita drop)
	thread::spawn(move || {
			match child.wait() {
					Ok(status) => {
							println!("[cloudflared] exited with: {:?}", status);
							// opcional: gravar no log final
							// let _ = writeln!(log_file, "[EXIT] {:?}", status);
					}
					Err(e) => {
							eprintln!("[cloudflared] wait error: {:?}", e);
					}
			}
	});

	// retorna sucesso imediato ao frontend
	Ok("started".into())
}

fn stop_tunnel_impl() -> Result<String> {
  let pid_path = pid_file_path()?;
  if let Some(pid_i32) = read_pid_file(&pid_path) {
    #[cfg(unix)]
    {
      use nix::sys::signal::{kill, Signal};
      use nix::unistd::Pid as NixPid;
      if kill(NixPid::from_raw(pid_i32), Signal::SIGTERM).is_ok() {
        let _ = fs::remove_file(&pid_path);
        return Ok("stopped".into());
      }
    }
    #[cfg(windows)]
    {
      use windows_sys::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
      use windows_sys::Win32::Foundation::CloseHandle;
      unsafe {
        let handle = OpenProcess(PROCESS_TERMINATE, 0, pid_i32 as u32);
        if handle != 0 {
          TerminateProcess(handle, 1);
          CloseHandle(handle);
          let _ = fs::remove_file(&pid_path);
          return Ok("stopped".into());
        }
      }
    }

    // fallback: kill by name (best-effort)
    let mut sys = System::new_all();
    sys.refresh_processes();
    for (pid_k, proc_) in sys.processes() {
      if proc_.name().to_lowercase().contains("cloudflared") {
        #[cfg(unix)]
        {
          use nix::sys::signal::{kill, Signal};
          use nix::unistd::Pid as NixPid;
          // pid_k -> sysinfo::Pid; converte para usize, depois para i32 se couber
          let raw_usize: usize = (*pid_k).into();
          if let Ok(raw_i32) = i32::try_from(raw_usize) {
            let _ = kill(NixPid::from_raw(raw_i32), Signal::SIGTERM);
          }
        }
        #[cfg(windows)]
        {
          // best-effort on windows; skipping detailed handle logic here
        }
      }
    }
    let _ = fs::remove_file(&pid_path);
    return Ok("stopped".into());
  } else {
    if !is_process_running_by_name("cloudflared") {
      return Ok("not_running".into());
    }
    let mut sys = System::new_all();
    sys.refresh_processes();
    for (pid_k, proc_) in sys.processes() {
      if proc_.name().to_lowercase().contains("cloudflared") {
        #[cfg(unix)]
        {
          use nix::sys::signal::{kill, Signal};
          use nix::unistd::Pid as NixPid;
          let raw_usize: usize = (*pid_k).into();
          if let Ok(raw_i32) = i32::try_from(raw_usize) {
            let _ = kill(NixPid::from_raw(raw_i32), Signal::SIGTERM);
          }
        }
      }
    }
    return Ok("stopped".into());
  }
}

fn tunnel_status_impl() -> Result<String> {
  let pid_path = pid_file_path()?;
  if let Some(pid_i32) = read_pid_file(&pid_path) {
    let pid_sys: sysinfo::Pid = (pid_i32 as usize).into();
    let mut sys = System::new_all();
    sys.refresh_processes();
    if sys.process(pid_sys).is_some() {
      return Ok("running".into());
    } else {
      return Ok("stale_pid".into());
    }
  }
  if is_process_running_by_name("cloudflared") {
    return Ok("running".into());
  }
  Ok("not_running".into())
}

/* -------------------------
   Wrappers expostos ao Tauri
   retornam Result<String, String>
   (mapear anyhow::Error -> String)
   ------------------------- */

#[tauri::command]
pub fn ensure_binary() -> Result<String, String> {
  ensure_binary_impl().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn start_tunnel() -> Result<String, String> {
  start_tunnel_impl().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_tunnel() -> Result<String, String> {
  stop_tunnel_impl().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn tunnel_status() -> Result<String, String> {
  tunnel_status_impl().map_err(|e| e.to_string())
}
