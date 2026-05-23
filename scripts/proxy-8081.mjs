import http from "http";

const server = http.createServer((req, res) => {
  const opts = {
    hostname: "127.0.0.1",
    port: 5000,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: "localhost:5000" },
  };
  const proxy = http.request(opts, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res, { end: true });
  });
  req.pipe(proxy, { end: true });
  proxy.on("error", () => { res.writeHead(502); res.end(); });
});

server.listen(8081, "0.0.0.0", () => {
  console.log("Port 8081 proxy → 5000 ready");
});
