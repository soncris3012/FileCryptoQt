#!/usr/bin/env bash
set -e

PORT=${1:-3000}
echo "Khởi động CryptoLab Web tại cổng $PORT..."

if command -v node >/dev/null 2>&1; then
    node -e "
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const mime = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };
    const server = http.createServer((req, res) => {
        let uri = req.url.split('?')[0];
        if (uri === '/') uri = '/index.html';
        const file = path.join(process.cwd(), uri);
        if (!fs.existsSync(file)) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('404 Not Found');
            return;
        }
        const ext = path.extname(file);
        res.writeHead(200, {'Content-Type': mime[ext] || 'application/octet-stream'});
        fs.createReadStream(file).pipe(res);
    });
    server.listen($PORT, () => {
        console.log('CryptoLab Web đã sẵn sàng: http://localhost:' + $PORT);
    });
    "
elif command -v python3 >/dev/null 2>&1; then
    python3 -m http.server "$PORT"
else
    echo "Lỗi: Cần cài đặt Node.js hoặc Python 3 để chạy máy chủ tĩnh cục bộ."
    exit 1
fi
