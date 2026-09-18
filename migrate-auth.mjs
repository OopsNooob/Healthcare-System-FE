import fs from 'fs';
import path from 'path';

const WEB_CLIENT_DIR = path.resolve('c:/SE121/Healthcare-System-FE/apps/web-client/src/features/auth');
const SHARED_HOOKS_DIR = path.resolve('c:/SE121/Healthcare-System-FE/packages/shared-hooks/src');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function processFile(filePath, destPath, type) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace API import
  const apiImportMatch = /import\s+\{.*api.*\}\s+from\s+["']@\/lib\/api["']/g;
  if (type === 'service') {
    content = content.replace(apiImportMatch, `import { api } from "../../api"`);
  } else if (type === 'hook') {
    content = content.replace(apiImportMatch, `import { api } from "../../api"`);
    // Hooks import services. Need to adjust the path from features/auth/services to ../../services/auth
    content = content.replace(/import\s+(.*)\s+from\s+["']\.\.\/services\/([^"']+)["']/g, `import $1 from "../../services/auth/$2"`);
  }

  // Replace auth store import
  content = content.replace(/import\s+\{\s*useAuthStore\s*\}\s+from\s+["']@repo\/ui\/store\/useAuthStore["']/g, `import { useSharedAuthStore as useAuthStore } from "../../store/useAuthStore"`);

  // Replace types import
  content = content.replace(/@repo\/ui\/types\/auth/g, `@repo/shared-types`);

  // Replace useToast import
  content = content.replace(/import\s+\{\s*useToast\s*\}\s+from\s+["']@repo\/ui\/hooks\/use-toast["']/g, `import { useToast } from "@repo/ui/hooks/use-toast"`);

  // Fix any hook importing useAuthStore
  content = content.replace(/useAuthStore\(/g, `useAuthStore(`);

  fs.writeFileSync(destPath, content);
  console.log(`Migrated ${path.basename(filePath)} to ${destPath}`);
}

const servicesDir = path.join(WEB_CLIENT_DIR, 'services');
const hooksDir = path.join(WEB_CLIENT_DIR, 'hooks');

const destServicesDir = path.join(SHARED_HOOKS_DIR, 'services', 'auth');
const destHooksDir = path.join(SHARED_HOOKS_DIR, 'hooks', 'auth');

ensureDir(destServicesDir);
ensureDir(destHooksDir);

fs.readdirSync(servicesDir).forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    processFile(path.join(servicesDir, file), path.join(destServicesDir, file), 'service');
  }
});

fs.readdirSync(hooksDir).forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    processFile(path.join(hooksDir, file), path.join(destHooksDir, file), 'hook');
  }
});
