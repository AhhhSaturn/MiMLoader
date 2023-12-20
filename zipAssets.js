const path = require('path');
const compressing = require('compressing');

compressing.zip.compressDir(path.join(__dirname, 'dist/linux-unpacked'), path.join(__dirname, 'dist/linux.zip'));
compressing.zip.compressDir(path.join(__dirname, 'dist/win-unpacked'), path.join(__dirname, 'dist/win.zip'));