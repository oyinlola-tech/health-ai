const fs = require('fs');
const path = require('path');
const htmlFiles = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.html')) htmlFiles.push(full);
  }
};
walk('public');
const bad = [];
htmlFiles.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('tailwind.config = {')) {
    if (c.includes('primary: "#161310"') || c.includes('background: "#fdf8f7"')) {
      bad.push(f.replace('public/', ''));
    }
  }
});
console.log('Pages with wrong palette:', bad.length);
bad.forEach(f => console.log(f));
