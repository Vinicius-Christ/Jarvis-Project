const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/admin/Documents/Jarvis-Project');
let replaceCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Global regex to find empty catch blocks, capturing the variable name (e.g. e, err, error)
    const regex = /catch\s*\(\s*([^)]+)\s*\)\s*\{\s*\}/gm;
    if (regex.test(content)) {
        const newContent = content.replace(regex, 'catch ($1) { console.error("[Silent Try-Catch]:", $1); }');
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Fixed inside: ' + file);
        replaceCount++;
    }
});
console.log('Fixed empty catch blocks in ' + replaceCount + ' files.');
