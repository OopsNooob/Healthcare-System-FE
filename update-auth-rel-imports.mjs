import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.resolve('c:/SE121/Healthcare-System-FE/apps/web-client/src/features/auth');

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

const allFiles = getAllFiles(AUTH_DIR);

allFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Replace hook imports
  const hookRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+["']\.\.\/hooks\/([^"']+)["']/g;
  if (hookRegex.test(content)) {
    content = content.replace(hookRegex, `import { $1 } from "@repo/shared-hooks"`);
    changed = true;
  }

  // Replace service imports if any
  const serviceRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+["']\.\.\/services\/([^"']+)["']/g;
  if (serviceRegex.test(content)) {
    content = content.replace(serviceRegex, `import { $1 } from "@repo/shared-hooks"`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated relative imports in ${filePath}`);
  }
});
