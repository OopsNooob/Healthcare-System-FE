import fs from 'fs';
import path from 'path';

const WEB_CLIENT_DIR = path.resolve('c:/SE121/Healthcare-System-FE/apps/web-client/src/features');
const SHARED_HOOKS_DIR = path.resolve('c:/SE121/Healthcare-System-FE/packages/shared-hooks/src');
const INDEX_FILE = path.join(SHARED_HOOKS_DIR, 'index.ts');

const featuresToMigrate = ['shared', 'profile', 'patient', 'doctor', 'chat'];

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

let newExports = [];

featuresToMigrate.forEach(feature => {
  const featureDir = path.join(WEB_CLIENT_DIR, feature);
  if (!fs.existsSync(featureDir)) return;
  
  const files = getFilesRecursively(featureDir);
  const hookOrServiceFiles = files.filter(f => f.includes('hooks') || f.includes('services'));
  
  hookOrServiceFiles.forEach(file => {
    // We only migrate the logic. We need to copy them to shared-hooks.
    // However, some files might depend on types defined locally or API.
    // Instead of doing it fully automated which could cause huge breakage,
    // let's just log what needs to be moved to understand the scope.
    console.log(file);
  });
});
