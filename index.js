import express from 'express';
import http from 'node:http';
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';

const server = http.createServer();
const app = express();
const bare = createBareServer('/bare/');

// --- [自動抽出ロジック] ---
const publicUv = path.join(process.cwd(), 'public', 'uv');
if (!fs.existsSync(publicUv)) {
    fs.mkdirSync(publicUv, { recursive: true });
}

// 依存ライブラリから最新のコアファイルをコピー
const uvFiles = ['uv.bundle.js', 'uv.client.js', 'uv.handler.js', 'uv.sw.js'];
uvFiles.forEach(file => {
    const src = path.join(uvPath, file);
    const dest = path.join(publicUv, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Synced: ${file}`);
    }
});
// -------------------------

app.use(cors());
app.use(express.static(path.join(process.cwd(), 'public')));

// 検索エンジンのフォールバックAPI
app.get('/api/search', async (req, res) => {
    const q = String(req.query.q || "").trim();
    const engines = [
        "https://duckduckgo.com/?q=%s",
        "https://search.brave.com/search?q=%s"
    ];
    for (const tpl of engines) {
        try {
            const url = tpl.replace('%s', encodeURIComponent(q));
            return res.json({ url });
        } catch (e) {}
    }
    res.json({ url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}` });
});

server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`SenninProxy OS Active on port ${PORT}`));

