const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const getAllFiles = (dirPath, arrayOfFiles) => {
  files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
};

const files = getAllFiles('./src');
const exports = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  const regex = /export\s+(const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    exports.push({ name: match[2], file: f });
  }
});

let deadCode = [];
exports.forEach(exp => {
  // skip index, constants, schema, db
  if (exp.file.includes('db') || exp.file.includes('schema') || exp.file.includes('constants')) return;
  
  try {
    const res = execSync(`grep -r "${exp.name}" ./src ./app`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = res.split('\n').filter(Boolean);
    // if the only match is the file where it is defined
    const usages = lines.filter(l => !l.includes(exp.file));
    if (usages.length === 0) {
      deadCode.push(exp);
    }
  } catch(e) {
    deadCode.push(exp); // grep fails if no matches
  }
});

console.log("Unused Exports found:", deadCode);
