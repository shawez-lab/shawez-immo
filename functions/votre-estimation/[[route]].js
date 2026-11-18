export async function onRequestGet({request,env,params}) {
  if(!/^[A-Za-z0-9_-]{43}\/?$/.test(String(params.route || ''))) return new Response('Page introuvable',{status:404});
  const r=await env.ASSETS.fetch(new URL('/estimation-personnalisee/',request.url));
  if(!r.ok)return new Response('Étude momentanément indisponible',{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'}});
  return new Response(r.body,{status:r.status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
}
