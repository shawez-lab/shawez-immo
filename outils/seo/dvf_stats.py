import json,glob,math,statistics as st,sys
pts=[]
for f in glob.glob('donnees-dvf/t/*.json'):
    pts+=json.load(open(f))
print('total',len(pts), 'periode', min(p[5] for p in pts), max(p[5] for p in pts))
def d(a,b,c,e):
    R=6371; x=math.radians(e-b)*math.cos(math.radians((a+c)/2)); y=math.radians(c-a); return R*math.hypot(x,y)
zones={ # centre approx (mairie / place centrale)
 'Dijon centre (1,2 km autour de la place de la Libération)':(47.3215,5.0415,1.2),
 'Dijon commune (5 km)':(47.3220,5.0415,4.0),
 'Montchapet (0,9 km)':(47.3315,5.0215,0.9),
 'Fontaine-lès-Dijon (1,5 km)':(47.3430,5.0205,1.3),
 'Talant (1,3 km)':(47.3365,5.0060,1.2),
 'Chenôve (1,5 km)':(47.2925,5.0070,1.5),
 'Quetigny (1,5 km)':(47.3140,5.1060,1.4),
 'Beaune (2 km)':(47.0240,4.8390,2.0),
 'Nuits-Saint-Georges (1,5 km)':(47.1370,4.9500,1.5),
}
for z,(la,lo,r) in zones.items():
    sel=[p for p in pts if d(la,lo,p[0],p[1])<=r and p[5]>=202501]
    for t,n in ((0,'appart'),(1,'maison')):
        s=[p[4] for p in sel if p[2]==t]
        if len(s)>=10:
            q=st.quantiles(s,n=4)
            print(f'{z}|{n}|2025|n={len(s)}|med={round(st.median(s)/10)*10}|q1={round(q[0]/10)*10}|q3={round(q[2]/10)*10}')
        else: print(f'{z}|{n}|2025|n={len(s)}|trop peu')
