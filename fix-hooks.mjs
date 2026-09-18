import fs from 'fs';
import path from 'path';

const SHARED_HOOKS_DIR = path.resolve('c:/SE121/Healthcare-System-FE/packages/shared-hooks/src');
const hooksDir = path.join(SHARED_HOOKS_DIR, 'hooks', 'auth');

fs.readdirSync(hooksDir).forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    const filePath = path.join(hooksDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Fix multi-line imports from ../services/
    content = content.replace(/import\s+([\s\S]*?)\s+from\s+["']\.\.\/services\/([^"']+)["']/g, `import $1 from "../../services/auth/$2"`);

    // Replace localStorage with getStorage()
    // First, ensure getStorage is imported
    if (content.includes('localStorage.') && !content.includes('getStorage')) {
        content = `import { getStorage } from "../../storage";\n` + content;
    }

    // Replace localStorage.setItem("accessToken", ...), etc
    // Wait, getStorage().setItem returns a Promise, but localStorage is sync.
    // However, we are in an async function in useLogin.ts. 
    // We should await getStorage().setItem
    content = content.replace(/localStorage\.setItem\(([^,]+),\s*([^)]+)\)/g, `await getStorage().setItem($1, $2)`);
    content = content.replace(/localStorage\.removeItem\(([^)]+)\)/g, `await getStorage().removeItem($1)`);
    content = content.replace(/localStorage\.getItem\(([^)]+)\)/g, `await getStorage().getItem($1)`);

    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  }
});
