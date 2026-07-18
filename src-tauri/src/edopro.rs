// src-tauri/src/edopro.rs
use anyhow::Result;
use std::path::PathBuf;
use std::process::Stdio;
use std::thread;
use std::time::Duration;
use sysinfo::{ProcessExt, System, SystemExt};
use tauri::Emitter;


#[cfg(unix)]
use nix::sys::signal::{kill, Signal};
#[cfg(unix)]
use nix::unistd::Pid as NixPid;

#[cfg(windows)]
use windows_sys::Win32::System::Threading::{OpenProcess, TerminateProcess};
#[cfg(windows)]
use windows_sys::Win32::Foundation::CloseHandle;

/// substring usada para detectar EdoPro
const EDOPRO_NAME: &str = "edopro";

fn find_pids_by_name(name_substr: &str) -> Vec<i32> {
  let mut sys = System::new_all();
  sys.refresh_processes();
  sys.processes()
    .iter()
    .filter_map(|(pid, proc_)| {
      let name = proc_.name().to_lowercase();
      let target = name_substr.to_lowercase();
      let mut matched = false;
      if name.contains(&target) {
        matched = true;
      } else if let Some(exe_name) = proc_.exe().file_name() {
        if exe_name.to_string_lossy().to_lowercase().contains(&target) {
          matched = true;
        }
      } else {
        let cmdline = proc_.cmd().join(" ").to_lowercase();
        if cmdline.contains(&target) {
          matched = true;
        }
      }
      if matched {
        let raw: usize = (*pid).into();
        raw.try_into().ok()
      } else {
        None
      }
    })
    .collect()
}

/// Retorna true se existir ao menos uma instância
#[tauri::command]
pub fn edopro_is_running() -> Result<bool, String> {
  Ok(!find_pids_by_name(EDOPRO_NAME).is_empty())
}

/// Inicia EdoPro a partir do caminho fornecido pelo frontend.
/// Retorna o PID do processo spawnado.
#[tauri::command]
pub fn edopro_start(path: String, args: Option<Vec<String>>) -> Result<u32, String> {
    use std::path::PathBuf;
    use std::process::Stdio;

    let exe_path = PathBuf::from(path.trim());

    #[cfg(target_os = "macos")]
    {
        // 1) Se for bundle (.app) use /usr/bin/open -a "<bundle>"
        if exe_path.extension().and_then(|s| s.to_str()).map(|s| s.eq_ignore_ascii_case("app")).unwrap_or(false) {
            let mut cmd = std::process::Command::new("/usr/bin/open");
            cmd.arg("-a").arg(exe_path.as_os_str());
            if let Some(a) = args {
                // passa argumentos para o app
                cmd.arg("--args");
                for arg in a { cmd.arg(arg); }
            }
            cmd.stdout(Stdio::null()).stderr(Stdio::piped()).stdin(Stdio::null());

            // tenta spawn e captura erro detalhado
            match cmd.spawn() {
                Ok(child) => return Ok(child.id()),
                Err(e) => {
                    return Err(format!("failed to spawn via /usr/bin/open: {} (path: {})", e, exe_path.display()));
                }
            }
        }

        // 2) Se for diretório (possível que o frontend enviou a pasta do project), tente montar o binário dentro do bundle
        if exe_path.is_dir() {
            // monta: <folder>/EDOPro.app
            let bundle = exe_path.join("EDOPro.app");
            if bundle.exists() {
                // recursivamente chamar a mesma função com o bundle montado
                return edopro_start(bundle.to_string_lossy().into_owned(), args);
            }
            // tenta Contents/MacOS/<basename> (caso frontend tenha passado a pasta do bundle)
            let bin_guess = exe_path.join("Contents").join("MacOS").join("EDOPro");
            if bin_guess.exists() {
                // garante bit executável e tenta spawn direto
                let _ = std::process::Command::new("/bin/chmod").arg("+x").arg(&bin_guess).status();
                let mut cmd = std::process::Command::new(bin_guess);
                if let Some(a) = args { for arg in a { cmd.arg(arg); } }
                cmd.stdout(Stdio::null()).stderr(Stdio::piped()).stdin(Stdio::null());
                return cmd.spawn().map(|c| c.id()).map_err(|e| format!("failed to spawn binary inside folder: {} (path: {})", e, exe_path.display()));
            }

            return Err(format!("provided path is a directory but no EDOPro.app or Contents/MacOS/EDOPro found inside: {}", exe_path.display()));
        }

        // 3) Se for caminho direto para o binário dentro do bundle
        if exe_path.exists() {
            // tenta garantir bit executável
            let _ = std::process::Command::new("/bin/chmod").arg("+x").arg(&exe_path).status();
            let mut cmd = std::process::Command::new(&exe_path);
            if let Some(a) = args { for arg in a { cmd.arg(arg); } }
            cmd.stdout(Stdio::null()).stderr(Stdio::piped()).stdin(Stdio::null());
            return cmd.spawn().map(|c| c.id()).map_err(|e| format!("failed to spawn edopro binary: {} (path: {})", e, exe_path.display()));
        }

        return Err(format!("executable or bundle not found: {}", exe_path.display()));
    }

    // fallback para outras plataformas (Linux/Windows)
    #[cfg(not(target_os = "macos"))]
    {
        if !exe_path.exists() {
            return Err("executable not found".into());
        }
        let mut cmd = std::process::Command::new(exe_path);
        if let Some(a) = args { for arg in a { cmd.arg(arg); } }
        cmd.stdout(Stdio::null()).stderr(Stdio::piped()).stdin(Stdio::null());
        return cmd.spawn().map(|c| c.id()).map_err(|e| format!("failed to spawn edopro: {}", e));
    }
}


#[cfg(unix)]
fn stop_pid_unix(pid: i32) -> Result<(), String> {
  let nix_pid = NixPid::from_raw(pid);
  kill(nix_pid, Signal::SIGTERM).map_err(|e| format!("SIGTERM failed: {}", e))?;
  thread::sleep(Duration::from_millis(500));
  let mut sys = System::new_all();
  sys.refresh_processes();
  if sys.process((pid as usize).into()).is_some() {
    kill(nix_pid, Signal::SIGKILL).map_err(|e| format!("SIGKILL failed: {}", e))?;
  }
  Ok(())
}

#[cfg(windows)]
fn stop_pid_windows(pid: i32) -> Result<(), String> {
  // PROCESS_TERMINATE é 0x0001; OpenProcess/TerminateProcess/CloseHandle estão disponíveis via windows-sys feature
  unsafe {
    let pid_u32 = pid as u32;
    // PROCESS_TERMINATE constant value
    const PROCESS_TERMINATE_FLAG: u32 = 0x0001;
    let handle = OpenProcess(PROCESS_TERMINATE_FLAG, 0, pid_u32);
    if handle == 0 {
      return Err("OpenProcess failed".into());
    }
    let ok = TerminateProcess(handle, 1);
    CloseHandle(handle);
    if ok == 0 {
      return Err("TerminateProcess failed".into());
    }
  }
  Ok(())
}

/// Fecha todas as instâncias do EdoPro sem interação do usuário.
#[tauri::command]
pub fn edopro_stop_all() -> Result<String, String> {
  let pids = find_pids_by_name(EDOPRO_NAME);
  if pids.is_empty() {
    return Ok("no_instances".into());
  }

  let mut last_err: Option<String> = None;
  for pid in pids {
    let res = {
      #[cfg(unix)]
      { stop_pid_unix(pid) }
      #[cfg(windows)]
      { stop_pid_windows(pid) }
      #[cfg(not(any(unix, windows)))]
      { Err("unsupported platform".to_string()) }
    };
    if let Err(e) = res {
      last_err = Some(e);
    }
  }

  if let Some(e) = last_err {
    Err(e)
  } else {
    Ok("stopped_all".into())
  }
}

/// Reinicia EdoPro: fecha todas as instâncias e inicia novamente com o mesmo path.
#[tauri::command]
pub fn edopro_restart(path: String, args: Option<Vec<String>>) -> Result<u32, String> {
  let _ = edopro_stop_all();
  thread::sleep(Duration::from_millis(400));
  edopro_start(path, args)
}

/// Opcional: watcher que emite evento Tauri quando o estado muda.
/// Agora aceita referência para AppHandle (chame com app.handle()).
pub fn spawn_edopro_watcher(app_handle: &tauri::AppHandle) {
  let app_handle = app_handle.clone();
  std::thread::spawn(move || {
    let mut last_running = false;
    loop {
      let running = !find_pids_by_name(EDOPRO_NAME).is_empty();
      if running != last_running {
        // use emit (single target) — emit returns Result, ignoramos falha
        let _ = app_handle.emit("edopro-state-changed", running);
        last_running = running;
      }
      std::thread::sleep(Duration::from_secs(2));
    }
  });
}
