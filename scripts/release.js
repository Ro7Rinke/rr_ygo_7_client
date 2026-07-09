import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Recriando variáveis globais do CommonJS no ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Como o script está em "scripts/", a raiz do projeto é uma pasta acima (..)
const ROOT_DIR = path.resolve(__dirname, '..');

// 🔧 CONFIGURAÇÕES
const GITHUB_BASE_URL = "https://github.com/Ro7Rinke/rr_ygo_7_client/releases/download";
const FILES = {
  packageJson: path.join(ROOT_DIR, 'package.json'),
  tauriConf: path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json'),
  updater: path.join(ROOT_DIR, 'refs', 'heads', 'main', 'updater.json'),
  cargoToml: path.join(ROOT_DIR, 'src-tauri', 'Cargo.toml')
};

// 1. Processar Argumentos da Linha de Comando
const args = process.argv.slice(2);
let degree = null;
let notes = "Nova atualização disponível.";

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--degree') degree = args[i + 1];
  if (args[i] === '--notes') notes = args[i + 1];
}

// 2. Lógica de Atualização de Versão (SemVer)
// Em ESM não podemos usar require() direto em JSON, então lemos com fs:
const pkgDataRaw = fs.readFileSync(FILES.packageJson, 'utf8');
let pkgData = JSON.parse(pkgDataRaw);
let currentVersion = pkgData.version;
let newVersion = currentVersion;

if (degree) {
  let [major, minor, patch] = currentVersion.split('.').map(Number);
  
  if (degree === 'big') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (degree === 'medium') {
    minor += 1;
    patch = 0;
  } else if (degree === 'small') {
    patch += 1;
  } else {
    console.error('❌ Grau inválido. Use: big, medium ou small.');
    process.exit(1);
  }

  newVersion = `${major}.${minor}.${patch}`;
  console.log(`🚀 Atualizando versão: ${currentVersion} -> ${newVersion}`);

  // Atualizar package.json
  pkgData.version = newVersion;
  fs.writeFileSync(FILES.packageJson, JSON.stringify(pkgData, null, 2));

  // Atualizar tauri.conf.json
  const tauriData = JSON.parse(fs.readFileSync(FILES.tauriConf, 'utf8'));
  tauriData.version = newVersion;
  fs.writeFileSync(FILES.tauriConf, JSON.stringify(tauriData, null, 2));
} else {
  console.log(`🔄 Mantendo a versão atual (${currentVersion}) e rodando build...`);
}

// Atualizar Cargo.toml (Necessário para o Windows/NSIS gerar o nome correto)
if (fs.existsSync(FILES.cargoToml)) {
  let cargoContent = fs.readFileSync(FILES.cargoToml, 'utf8');
  // Substitui a primeira ocorrência de version = "x.x.x" no Cargo.toml
  cargoContent = cargoContent.replace(/^version = ".*?"/m, `version = "${newVersion}"`);
  fs.writeFileSync(FILES.cargoToml, cargoContent);
  console.log(`📝 Cargo.toml sincronizado com sucesso para v${newVersion}`);
}

// 3. Rodar o Build do Tauri injetando o .env
try {
  console.log('⏳ Iniciando build do Tauri...');
  
  // Clona as variáveis de ambiente e força a senha vazia 
  // para o Tauri não abrir o prompt interativo
  const buildEnv = { 
    ...process.env, 
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || "" 
  };

  execSync('npx @tauri-apps/cli build', { stdio: 'inherit', env: buildEnv, cwd: ROOT_DIR });
} catch (error) {
  console.error('❌ Falha no build do Tauri.');
  process.exit(1);
}

// 4. Mapear Plataforma/Arquitetura e Coletar a Assinatura
const platformMap = {
  darwin: {
    archMap: { x64: 'darwin-x86_64', arm64: 'darwin-aarch64' },
    bundleDir: path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'bundle', 'macos'),
    ext: '.app.tar.gz'
  },
  win32: {
    archMap: { x64: 'windows-x86_64' },
    bundleDir: path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'bundle', 'nsis'),
    ext: '-setup.exe'
  }
};

const osPlatform = os.platform();
const osArch = os.arch();
const targetConfig = platformMap[osPlatform];

if (!targetConfig || !targetConfig.archMap[osArch]) {
  console.warn(`⚠️ Plataforma/Arquitetura não mapeada para auto-update automático: ${osPlatform} ${osArch}`);
  process.exit(0);
}

const updaterPlatformKey = targetConfig.archMap[osArch];

// Encontrar o arquivo .sig na pasta de build
console.log(`🔍 Procurando arquivo de assinatura em: ${targetConfig.bundleDir}`);
const filesInDir = fs.readdirSync(targetConfig.bundleDir);
const sigFile = filesInDir.find(f => f.endsWith(`${targetConfig.ext}.sig`));
const targetFile = filesInDir.find(f => f.endsWith(targetConfig.ext) && !f.endsWith('.sig'));

if (!sigFile || !targetFile) {
  console.error('❌ Arquivo .sig ou pacote de instalação não encontrado!');
  process.exit(1);
}

const signatureContent = fs.readFileSync(path.join(targetConfig.bundleDir, sigFile), 'utf8').trim();

// 5. Atualizar o updater.json
let updaterData = { version: newVersion, notes: notes, pub_date: new Date().toISOString(), platforms: {} };

if (fs.existsSync(FILES.updater)) {
  updaterData = JSON.parse(fs.readFileSync(FILES.updater, 'utf8'));
  // Atualiza metadados gerais se a versão mudou
  if (degree) {
    updaterData.version = newVersion;
    updaterData.notes = notes;
    updaterData.pub_date = new Date().toISOString();
  }
}

// Inserir os dados da plataforma que acabou de ser buildada
updaterData.platforms[updaterPlatformKey] = {
  signature: signatureContent,
  url: `${GITHUB_BASE_URL}/v${newVersion}/${targetFile}`
};

fs.writeFileSync(FILES.updater, JSON.stringify(updaterData, null, 2));

console.log(`✅ updater.json atualizado com sucesso para ${updaterPlatformKey}!`);
console.log(`📁 Arquivo gerado: ${targetFile}`);