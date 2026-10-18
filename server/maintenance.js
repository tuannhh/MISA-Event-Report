// Short deployment-only page. Does not connect to or migrate the database.
import http from 'node:http';
http.createServer((req,res)=>{
 if(req.url==='/api/health'){res.setHeader('Content-Type','application/json');res.end('{"ok":true,"maintenance":true}');return;}
 res.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Retry-After':'120','Cache-Control':'no-store'});
 res.end('<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Event Report</title><main style="font:16px system-ui;max-width:520px;margin:15vh auto;padding:24px"><h1>Event Report đang cập nhật</h1><p>Dữ liệu của bạn được giữ nguyên. Vui lòng mở lại sau ít phút.</p></main></html>');
}).listen(Number(process.env.PORT||8080),'0.0.0.0');
