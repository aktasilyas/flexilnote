
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

// dist klasörünü temizle ve yeniden oluştur
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// Kopyalanacak dosyalar ve klasörler
const assets = [
    'index.html',
    'index.tsx',
    'App.tsx',
    'types.ts',
    'constants.tsx',
    'components',
    'services',
    'metadata.json'
];

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

console.log('Building assets for Capacitor...');
assets.forEach(asset => {
    if (fs.existsSync(asset)) {
        copyRecursiveSync(asset, path.join(distDir, asset));
    }
});
console.log('Build complete! dist folder is ready.');
