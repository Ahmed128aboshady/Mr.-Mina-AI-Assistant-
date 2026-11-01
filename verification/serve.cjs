const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const demo=process.env.MENA_LOCAL_DEMO==='1';
const port=demo?4320:4319;
const baseline=new Map(['index.html','js/app.js','mobile.html'].map(file=>[file,cp.execFileSync('git',['show','27154003af317cc2a1c2a3ae76ae8e4e49b7015e:'+file],{cwd:root,maxBuffer:5e6})]));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg'};
http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const original=name.startsWith('/baseline/');if(original)name=name.slice('/baseline'.length);
 if(name==='/')name='/index.html';const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const send=data=>{const total=data.length,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);const headers={'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 if(range){const start=Number(range[1]),end=Math.min(Number(range[2]||total-1),total-1);if(start>=total){res.writeHead(416,{'Content-Range':`bytes */${total}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${total}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));}else{res.writeHead(200,{...headers,'Content-Length':total});res.end(data);}};
 if(demo&&name==='/js/supabase_config.js'){
   send(Buffer.from('window.MENA_SUPABASE_CONFIG={isLocalDemo:true,isConfigured:()=>false,getUrl:()=>"",getAnonKey:()=>""};window.getSupabaseClient=()=>null;'));
 }else if(original&&baseline.has(name.slice(1)))send(baseline.get(name.slice(1)));else fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}send(data);});
}).listen(port,'127.0.0.1',()=>console.log(`Local ${demo?'demo (no database connection)':'integration'}: http://127.0.0.1:${port}/`));
