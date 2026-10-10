import re,os,sys,html,urllib.parse
from collections import deque,defaultdict
root=sys.argv[1]
def path_to_file(p):
    p=urllib.parse.urlparse(p).path
    f=os.path.join(root,p.lstrip('/'))
    if p.endswith('/'): f=os.path.join(f,'index.html')
    return f
redir=set()
for l in open(os.path.join(root,'_redirects')):
    s=l.split()
    if len(s)>=2 and not s[0].startswith('#'): redir.add(s[0].rstrip('/')+'/'); redir.add(s[0])
seen={}; q=deque(['/']); inlinks=defaultdict(set); broken=defaultdict(set)
while q:
    u=q.popleft()
    if u in seen: continue
    f=path_to_file(u)
    if not os.path.isfile(f):
        if u in redir or u.rstrip('/')+'/' in redir: seen[u]='redir'; continue
        seen[u]='404'; continue
    seen[u]='ok'
    if not f.endswith('.html'): continue
    h=open(f,encoding='utf-8',errors='ignore').read()
    for m in re.finditer(r'href="([^"#?]*)',h):
        l=html.unescape(m.group(1))
        if l.startswith('https://shawez-immo.com'): l=l[len('https://shawez-immo.com'):] or '/'
        if not l.startswith('/') or l.startswith('//'): continue
        if re.search(r'\.(css|js|png|webp|jpg|ico|xml|json|webmanifest|woff2|mp4|pdf|txt)$',l):
            if not os.path.isfile(path_to_file(l)): broken[l].add(u)
            continue
        if not l.endswith('/') and '.' not in l.split('/')[-1]: l=l+'/'
        inlinks[l].add(u); q.append(l)
ok=[u for u,s in seen.items() if s=='ok']
print('pages crawlées',len(ok),'| redirigées',sum(1 for s in seen.values() if s=='redir'))
print('404 internes:',{u:sorted(inlinks[u])[:3] for u,s in seen.items() if s=='404'})
print('fichiers manquants:',dict(list(broken.items())[:10]))
sm=re.findall(r'<loc>https://shawez-immo.com([^<]*)</loc>',open(os.path.join(root,'sitemap.xml')).read())
print('dans sitemap mais pas atteintes par liens (orphelines):',[u for u in sm if u not in seen])
print('atteintes mais absentes du sitemap:',[u for u in ok if u not in sm and not re.search(r'merci|mon-espace|admin|404|annonces/|biens-a-vendre/$|estimation-en-ligne',u)][:20])
for u in ['/prix-immobilier-dijon/','/agent-immobilier-beaune/','/immobilier-fontaine-les-dijon/','/immobilier-nuits-saint-georges/','/conseils-vendeurs/vendre-maison-succession-dijon/']:
    print('liens entrants',u,len(inlinks[u]))
