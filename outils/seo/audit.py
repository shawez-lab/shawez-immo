import re,json,glob,os,sys,html
root=sys.argv[1] if len(sys.argv)>1 else '.'
files=sorted(glob.glob(root+'/**/index.html',recursive=True))+[root+'/404.html']
skip=('posts-images','de-claude','annonces/','outils/','admin','mon-espace','node_modules','donnees-dvf','guides/')
rows=[];titles={};descs={}
for f in files:
    rel=os.path.relpath(f,root).replace('index.html','')
    if any(s in rel for s in skip): continue
    h=open(f,encoding='utf-8',errors='ignore').read()
    t=re.search(r'<title>(.*?)</title>',h,re.S); t=html.unescape(t.group(1).strip()) if t else ''
    d=re.search(r'<meta name="description" content="(.*?)"',h,re.S); d=html.unescape(d.group(1)) if d else ''
    h1=len(re.findall(r'<h1[\s>]',h)); can=re.search(r'rel="canonical" href="(.*?)"',h); can=can.group(1) if can else ''
    noidx='noindex' in (re.search(r'<meta name="robots" content="(.*?)"',h) or [None,''])[1] if re.search(r'<meta name="robots"',h) else False
    types=set()
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>',h,re.S):
        try:
            j=json.loads(m.group(1))
            def walk(x):
                if isinstance(x,dict):
                    if '@type' in x: types.add(x['@type'] if isinstance(x['@type'],str) else '/'.join(x['@type']))
                    for v in x.values(): walk(v)
                elif isinstance(x,list):
                    for v in x: walk(v)
            walk(j)
        except Exception as e: types.add('JSONERR')
    rows.append((rel or '/',len(t),len(d),h1,bool(can),noidx,','.join(sorted(types))[:120],t[:70]))
    titles.setdefault(t,[]).append(rel); descs.setdefault(d,[]).append(rel)
for r in rows: print('|'.join(map(str,r)))
print('DUP titles',[v for k,v in titles.items() if len(v)>1]); print('DUP desc',[v for k,v in descs.items() if len(v)>1])
