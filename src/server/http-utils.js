const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const COMPRESSIBLE = new Set([
  ".html", ".css", ".js", ".json", ".svg",
]);

function acceptsGzip(req) {
  return (req && req.headers && req.headers["accept-encoding"] || "").includes("gzip");
}

function sendGzip(res, statusCode, headers, body, req) {
  if (req && acceptsGzip(req) && body.length > 256) {
    zlib.gzip(body, (err, compressed) => {
      if (err) {
        res.writeHead(statusCode, headers);
        res.end(body);
        return;
      }
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
      res.writeHead(statusCode, headers);
      res.end(compressed);
    });
  } else {
    res.writeHead(statusCode, headers);
    res.end(body);
  }
}

function sendJson(res, statusCode, payload, req) {
  const body = Buffer.from(JSON.stringify(payload), "utf-8");
  sendGzip(res, statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  }, body, req);
}

function computeETag(data) {
  return '"' + crypto.createHash("md5").update(data).digest("hex").slice(0, 16) + '"';
}

function sendFile(res, filePath, req) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
    };
    const etag = computeETag(data);
    const ifNoneMatch = req && req.headers && req.headers["if-none-match"];
    if (ifNoneMatch === etag) {
      res.writeHead(304);
      res.end();
      return;
    }
    const headers = {
      "Content-Type": typeMap[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "ETag": etag,
    };
    if (COMPRESSIBLE.has(ext)) {
      sendGzip(res, 200, headers, data, req);
    } else {
      res.writeHead(200, headers);
      res.end(data);
    }
  });
}

module.exports = {
  sendFile,
  sendJson,
};
