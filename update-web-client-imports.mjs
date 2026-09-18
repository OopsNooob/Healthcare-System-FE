import fs from 'fs';
import path from 'path';

const WEB_CLIENT_DIR = path.resolve('c:/SE121/Healthcare-System-FE/apps/web-client/src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getAllFiles(WEB_CLIENT_DIR);

allFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Replace hook imports
  const hookRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+["']@\/features\/auth\/hooks\/([^"']+)["']/g;
  if (hookRegex.test(content)) {
    content = content.replace(hookRegex, `import { $1 } from "@repo/shared-hooks"`);
    changed = true;
  }

  // Also replace relative imports if any
  const relHookRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+["']\.\.\/\.\.\/hooks\/([^"']+)["']/g;
  if (relHookRegex.test(content)) {
    content = content.replace(relHookRegex, `import { $1 } from "@repo/shared-hooks"`);
    changed = true;
  }

  // Replace service imports if any
  const serviceRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+["']@\/features\/auth\/services\/([^"']+)["']/g;
  if (serviceRegex.test(content)) {
    content = content.replace(serviceRegex, `import { $1 } from "@repo/shared-hooks"`);
    changed = true;
  }
  
  // Replace useAuthStore import in web-client
  const storeRegex = /import\s+\{\s*useAuthStore\s*\}\s+from\s+["']@repo\/ui\/store\/useAuthStore["']/g;
  if (storeRegex.test(content)) {
    content = content.replace(storeRegex, `import { useSharedAuthStore as useAuthStore } from "@repo/shared-hooks"`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated imports in ${filePath}`);
  }
});
