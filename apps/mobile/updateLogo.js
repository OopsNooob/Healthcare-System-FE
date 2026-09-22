const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src/app/(auth)');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('<Plus color="#10b981" size={32} />')) {
    content = content.replace('<Plus color="#10b981" size={32} />', '<Cross color="#10b981" fill="#10b981" size={32} />');
    changed = true;
  }

  if (changed) {
    // Also need to import Cross if not present, and maybe remove Plus if it's not used elsewhere.
    if (!content.includes('Cross')) {
      content = content.replace('Plus', 'Cross');
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
