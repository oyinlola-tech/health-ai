import fs from 'fs';
import path from 'path';

const dir = 'public';
const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.html')) files.push(full);
  }
};
walk(dir);

let patched = 0;
for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('tailwind.config = {')) continue;
  if (!c.includes('primary: "#161310"')) continue;

  const map = [
    ['primary: "#161310"', 'primary: "#2B2724"'],
    ['background: "#fdf8f7"', 'background: "#FDF6F3"'],
    ['surface: "#fdf8f7"', 'surface: "#FFFFFF"'],
    ['secondary: "#645d56"', 'secondary: "#A19890"'],
    ['on-background: "#1c1b1b"', 'on-background: "#2B2724"'],
    ['on-surface: "#1c1b1b"', 'on-surface: "#2B2724"'],
    ['on-primary: "#ffffff"', 'on-primary: "#FFFFFF"'],
    ['on-surface-variant: "#4d4540"', 'on-surface-variant: "#A19890"'],
    ['outline: "#7e756f"', 'outline: "#A19890"'],
    ['outline-variant: "#cfc4bd"', 'outline-variant: "#E8E4E1"'],
    ['surface-container-low: "#f7f3f1"', 'surface-container-low: "#FFFFFF"'],
    ['surface-container: "#f1edec"', 'surface-container: "#FFFFFF"'],
    ['surface-dim: "#ddd9d8"', 'surface-dim: "#FDF6F3"'],
    ['surface-variant: "#e6e1e0"', 'surface-variant: "#E8E4E1"'],
    ['secondary-container: "#e9ded5"', 'secondary-container: "#FDF6F3"'],
    ['primary-container: "#2b2724"', 'primary-container: "#2B2724"'],
    ['on-primary-container: "#948e89"', 'on-primary-container: "#FFFFFF"'],
    ['on-secondary-container: "#69615a"', 'on-secondary-container: "#FFFFFF"'],
    ['surface-container-high: "#ece7e6"', 'surface-container-high: "#FFFFFF"'],
    ['primary-fixed: "#e9e1dc"', 'primary-fixed: "#E8E4E1"'],
    ['primary-fixed-dim: "#cdc5c0"', 'primary-fixed-dim: "#E8E4E1"'],
    ['secondary-fixed: "#ebe1d8"', 'secondary-fixed: "#FFFFFF"'],
    ['secondary-fixed-dim: "#cfc5bc"', 'secondary-fixed-dim: "#E8E4E1"'],
    ['tertiary: "#121415"', 'tertiary: "#2B2724"'],
    ['tertiary-container: "#27282a"', 'tertiary-container: "#2B2724"'],
    ['on-primary-fixed: "#1e1b18"', 'on-primary-fixed: "#2B2724"'],
    ['on-primary-fixed-variant: "#4b4642"', 'on-primary-fixed-variant: "#2B2724"'],
    ['on-secondary-fixed: "#201b15"', 'on-secondary-fixed: "#2B2724"'],
    ['on-secondary-fixed-variant: "#4c463f"', 'on-secondary-fixed-variant: "#2B2724"'],
    ['on-tertiary: "#ffffff"', 'on-tertiary: "#FFFFFF"'],
    ['on-tertiary-fixed: "#1a1c1e"', 'on-tertiary-fixed: "#FFFFFF"'],
    ['on-tertiary-fixed-variant: "#464749"', 'on-tertiary-fixed-variant: "#FFFFFF"'],
    ['on-tertiary-container: "#8f8f91"', 'on-tertiary-container: "#A19890"'],
    ['on-error: "#ffffff"', 'on-error: "#FFFFFF"'],
    ['on-error-container: "#93000a"', 'on-error-container: "#2B2724"'],
    ['error: "#ba1a1a"', 'error: "#FF6E5C"'],
    ['error-container: "#ffdad6"', 'error-container: "#FDF6F3"'],
    ['inverse-primary: "#cdc5c0"', 'inverse-primary: "#A19890"'],
    ['inverse-surface: "#313030"', 'inverse-surface: "#2B2724"'],
    ['inverse-on-surface: "#f4f0ee"', 'inverse-on-surface: "#FFFFFF"'],
    ['surface-bright: "#fdf8f7"', 'surface-bright: "#FFFFFF"'],
    ['surface-tint: "#635d5a"', 'surface-tint: "#FF6E5C"'],
    ['surface-container-lowest: "#ffffff"', 'surface-container-lowest: "#FFFFFF"'],
    ['surface-container-highest: "#e6e1e0"', 'surface-container-highest: "#E8E4E1"'],
  ];

  let changed = false;
  for (const [from, to] of map) {
    if (c.includes(from)) {
      c = c.split(from).join(to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, c);
    patched++;
    console.log('Patched:', path.relative('.', file));
  }
}
console.log(`\nTotal patched: ${patched}`);
