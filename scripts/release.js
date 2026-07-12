import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Recriando variáveis globais do CommonJS no ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
let customNotes = null; // 👈 MUDANÇA: Começa nulo para saber se o usuário passou ou não

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--degree') degree = args[i + 1];
  if (args[i] === '--notes') customNotes = args[i + 1];
}

// 2. Lógica de Atualização de Versão (SemVer)
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

// Atualizar Cargo.toml
if (fs.existsSync(FILES.cargoToml)) {
  let cargoContent = fs.readFileSync(FILES.cargoToml, 'utf8');
  cargoContent = cargoContent.replace(/^version = ".*?"/m, `version = "${newVersion}"`);
  fs.writeFileSync(FILES.cargoToml, cargoContent);
  console.log(`📝 Cargo.toml sincronizado com sucesso para v${newVersion}`);
}

// 3. Mapear Plataforma/Arquitetura
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

// 🧹 Limpa a pasta do bundle antes do build
if (fs.existsSync(targetConfig.bundleDir)) {
  console.log(`🧹 Limpando pasta de bundle anterior: ${targetConfig.bundleDir}`);
  fs.rmSync(targetConfig.bundleDir, { recursive: true, force: true });
}

// 4. Rodar o Build do Tauri
try {
  console.log('⏳ Iniciando build do Tauri...');
  
  const buildEnv = { 
    ...process.env, 
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || "" 
  };

  execSync('npx @tauri-apps/cli build', { stdio: 'inherit', env: buildEnv, cwd: ROOT_DIR });
} catch (error) {
  console.error('❌ Falha no build do Tauri.');
  process.exit(1);
}

// 5. Coletar o arquivo .sig e o Pacote
const updaterPlatformKey = targetConfig.archMap[osArch];

console.log(`🔍 Procurando arquivo de assinatura em: ${targetConfig.bundleDir}`);
const filesInDir = fs.readdirSync(targetConfig.bundleDir);

let sigFile, targetFile;

if (osPlatform === 'win32') {
  sigFile = filesInDir.find(f => f.includes(newVersion) && f.endsWith(`${targetConfig.ext}.sig`));
  targetFile = filesInDir.find(f => f.includes(newVersion) && f.endsWith(targetConfig.ext) && !f.endsWith('.sig'));
} else {
  sigFile = filesInDir.find(f => f.endsWith(`${targetConfig.ext}.sig`));
  targetFile = filesInDir.find(f => f.endsWith(targetConfig.ext) && !f.endsWith('.sig'));
}

if (!sigFile || !targetFile) {
  console.error(`❌ Arquivo .sig ou pacote de instalação não encontrado para ${osPlatform}!`);
  console.error(`Arquivos encontrados na pasta:`, filesInDir);
  process.exit(1);
}

const signatureContent = fs.readFileSync(path.join(targetConfig.bundleDir, sigFile), 'utf8').trim();

// 6. Atualizar o updater.json de forma segura
let updaterData = {
  version: newVersion,
  notes: customNotes || "Nova atualização disponível.",
  pub_date: new Date().toISOString(),
  platforms: {}
};

if (fs.existsSync(FILES.updater)) {
  try {
    updaterData = JSON.parse(fs.readFileSync(FILES.updater, 'utf8'));
  } catch (err) {
    console.warn('⚠️ Erro ao ler updater.json existente, criando novo.');
  }
}

// Atualizar versão e data
updaterData.version = newVersion;
updaterData.pub_date = new Date().toISOString();

// 💡 SÓ atualiza o 'notes' se o usuário realmente passou a flag --notes
if (customNotes) {
  updaterData.notes = customNotes;
} else if (!updaterData.notes) {
  updaterData.notes = "Nova atualização disponível.";
}

if (!updaterData.platforms) {
  updaterData.platforms = {};
}

// Inserir os dados da plataforma que acabou de ser compilada
updaterData.platforms[updaterPlatformKey] = {
  signature: signatureContent,
  url: `${GITHUB_BASE_URL}/v${newVersion}/${targetFile}`
};

// Garantir que a pasta do updater.json existe antes de salvar
const updaterDir = path.dirname(FILES.updater);
if (!fs.existsSync(updaterDir)) {
  fs.mkdirSync(updaterDir, { recursive: true });
}

fs.writeFileSync(FILES.updater, JSON.stringify(updaterData, null, 2));

console.log(`✅ updater.json atualizado com sucesso para ${updaterPlatformKey}!`);
console.log(`📝 Notes mantido/atualizado como: "${updaterData.notes}"`);
console.log(`📁 Arquivo gerado: ${targetFile}`);
console.log(`🔗 URL: ${GITHUB_BASE_URL}/v${newVersion}/${targetFile}`);