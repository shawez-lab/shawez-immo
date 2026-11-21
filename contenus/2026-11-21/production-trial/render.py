"""Original motion-graphics series. No avatar, stock footage or external music.
Usage: python render.py --out path [--episode id] [--frames]
FONT_BOLD and FONT_MONO may point to licensed local font files.
"""
import argparse,json,math,os,subprocess,wave,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parent
CFG=json.loads((ROOT/'episodes.json').read_text())
W,H=CFG['width'],CFG['height'];FPS=CFG['fps'];DUR=CFG['duration']
BG='#111735'; IVORY='#f4f1e8'; LIME='#d6f368';CORAL='#ff987e';MUTED='#b8bdd0'
BOLD=os.environ.get('FONT_BOLD','/System/Library/Fonts/Supplemental/Arial Bold.ttf')
MONO=os.environ.get('FONT_MONO','/System/Library/Fonts/Supplemental/Andale Mono.ttf')
FFMPEG=os.environ.get('FFMPEG_BIN',imageio_ffmpeg.get_ffmpeg_exe())
BOUNDS=[];CACHE={}
def font(size,mono=False):return ImageFont.truetype(MONO if mono else BOLD,size)
def fit(lines,maxsize=94,maxw=780,mono=False):
 for size in range(maxsize,15,-1):
  f=font(size,mono)
  if max(f.getlength(x) for x in lines)<=maxw:return f
 raise ValueError(('text too wide',lines))
def txt(im,lines,y,size=88,color=IVORY,maxw=780,mono=False,gap=18,center=540,record=False):
 if isinstance(lines,str):lines=[lines]
 f=fit(lines,size,maxw,mono);d=ImageDraw.Draw(im)
 for line in lines:
  box=d.textbbox((0,0),line,font=f);width=box[2]-box[0]
  x=round(center-width/2)-box[0]
  d.text((x,y-box[1]),line,font=f,fill=color)
  if record:BOUNDS.append([line,x+box[0],y,x+box[2],y+box[3]-box[1]])
  y+=box[3]-box[1]+gap
 return y

def base(accent,light=False):
 im=Image.new('RGB',(W,H),IVORY if light else BG);d=ImageDraw.Draw(im)
 # Abstract route grid, deliberately no claim of street accuracy.
 grid='#e2dfd6' if light else '#202949'
 for x in range(-600,1700,180):d.line((x,0,x+900,H),fill=grid,width=2)
 for y in range(-700,2300,210):d.line((0,y,W,y-420),fill=grid,width=2)
 return im

def scene_layer(ep,scene,record=False):
 key=(ep['id'],scene['start'])
 if key in CACHE:return CACHE[key].copy()
 kind=scene['kind']; accent=LIME if ep['accent']=='lime' else CORAL
 light=kind in ('statement','resolve'); im=base(accent,light);d=ImageDraw.Draw(im)
 ink=BG if light else IVORY; quiet='#4a5269' if light else MUTED
 txt(im,scene['kicker'],290,27,ink if light else accent,mono=True,record=record)
 if kind=='intro':
  txt(im,scene['lines'],560,108,record=record)
  txt(im,scene['small'],1050,40,accent,record=record)
  txt(im,'CHARGEMENT DE LA MISSION',1290,25,MUTED,mono=True,record=record)
 elif kind=='map':
  txt(im,scene['lines'],460,68,record=record)
  # Original design from the public commune boundary, no copied map image.
  geo=json.loads((ROOT/'dijon-contour.geojson').read_text())
  ring=geo['geometry']['coordinates'][0]
  lat=sum(v[1] for v in ring)/len(ring);cos=math.cos(math.radians(lat))
  xy=[(v[0]*cos,v[1]) for v in ring];xs=[v[0] for v in xy];ys=[v[1] for v in xy]
  scale=min(650/(max(xs)-min(xs)),570/(max(ys)-min(ys)))
  cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2
  pts=[(round(540+(x-cx)*scale),round(950-(y-cy)*scale)) for x,y in xy]
  d.polygon(pts,fill='#263454');d.line(pts,fill=accent,width=5)
  txt(im,'DIJON',930,53,IVORY,record=record)
  # Workflow labels are explicitly separate from geographic positions.
  txt(im,'PARCOURS DE VENTE',1270,24,accent,mono=True,record=record)
  txt(im,' → '.join(scene['nodes']),1330,25,IVORY,maxw=790,mono=True,record=record)
  txt(im,'Contour communal • geo.api.gouv.fr',1420,24,MUTED,record=record)
 elif kind=='compare':
  txt(im,scene['lines'],470,76,record=record)
  for x,text in [(315,scene['left']),(765,scene['right'])]:
   d.rectangle((x-195,890,x+195,1110),fill='#202949',outline='#58617d',width=3)
   txt(im,text,970,28,accent if x>500 else IVORY,maxw=340,mono=True,center=x,record=record)
  d.line((515,1000,560,1000),fill=accent,width=5)
  d.polygon([(548,988),(565,1000),(548,1012)],fill=accent)
  txt(im,wrap(scene['small'],40),1290,35,MUTED,record=record)
 elif kind in ('scan','sequence'):
  txt(im,scene['lines'],460,80,record=record)
  for j,word in enumerate(scene['tokens']):
   y=870+j*110
   d.line((190,y+13,215,y+36,252,y-8),fill=accent,width=7)
   f=fit([word],44,600,True);d.text((295,y-10),word,font=f,fill=IVORY)
   if record:BOUNDS.append([word,295,y-10,295+f.getlength(word),y+60])
  txt(im,wrap(scene['small'],40),1380,32,MUTED,record=record)
 elif kind=='statement':
  txt(im,scene['lines'],680,90,ink,record=record)
  txt(im,wrap(scene['small'],39),1230,36,quiet,record=record)
 elif kind=='resolve':
  txt(im,scene['lines'],700,90,ink,record=record)
  txt(im,wrap(scene['small'],37),1130,36,quiet,record=record)
  txt(im,'shawez-immo.com',1400,27,ink,mono=True,record=record)
 elif kind=='cta':
  txt(im,scene['lines'][0],700,70,record=record)
  txt(im,scene['lines'][1],840,105,accent,maxw=800,record=record)
  txt(im,scene['small'],1140,43,record=record)
  txt(im,'Shawez Ali • Agent immobilier',1350,28,MUTED,record=record)
  txt(im,'GRAVELIN IMMO',1410,25,MUTED,mono=True,record=record)
 if record:CACHE[key]=im.copy()
 return im

def wrap(text,n):
 words=text.split();lines=[];line=''
 for w in words:
  if len(line)+len(w)+1>n:lines.append(line);line=w
  else:line=(line+' '+w).strip()
 if line:lines.append(line)
 return lines

def frame(ep,n):
 t=n/FPS; scene=next(s for s in ep['scenes'] if s['start']<=t<s['end']);im=scene_layer(ep,scene)
 d=ImageDraw.Draw(im);local=t-scene['start'];accent=LIME if ep['accent']=='lime' else CORAL
 # Intro bar means loading a fictional mission, not performance or a price.
 if scene['kind']=='intro':
  d.rectangle((180,1370,900,1384),fill='#39425c')
  d.rectangle((180,1370,180+int(720*min(local/1.2,1)),1384),fill=accent)
 if scene['kind']=='map' and local<.8:
  # Brief scanner crosses the commune, then leaves the map quiet for reading.
  y=680+int(540*local/.8);d.line((210,y,870,y),fill=IVORY,width=3)
 # Single short wipe at state handoff, all text then holds still.
 if local<.18 and scene['start']>0:
  x=int(W*(1-local/.18));d.rectangle((0,0,x,H),fill=accent)
 return im

def music(path):
 sr=48000;t=np.arange(int(DUR*sr))/sr;out=np.zeros((len(t),2),np.float64)
 bpm=104;beat=60/bpm; chords=[[50,57,62,65],[46,53,58,62],[53,60,65,69],[48,55,60,64]]
 def tone(start,duration,midi,amp,pan=0):
  n=int(duration*sr);a=np.arange(n)/sr;freq=440*2**((midi-69)/12)
  env=np.minimum(a/.02,1)*np.minimum((duration-a)/.2,1)*np.exp(-a*1.5)
  wavev=(np.sin(2*np.pi*freq*a)+.15*np.sin(2*np.pi*freq*2*a))*env*amp
  i=int(start*sr);n=min(n,len(out)-i)
  if n>0:out[i:i+n,0]+=wavev[:n]*(1-pan)/2;out[i:i+n,1]+=wavev[:n]*(1+pan)/2
 for b in range(int(DUR/beat)):
  when=b*beat;ch=chords[(b//8)%4]
  tone(when,.42,ch[b%4]+12,.06,(-.3,.3)[b%2]);
  if b%4==0:tone(when,1.8,ch[0]-12,.08)
 # Motif original, restrained event accents with decays.
 for when in (3,7,12,17,23,28):
  tone(when,.18,86,.035,-.1);tone(when+.12,.28,93,.025,.1)
 fade=np.minimum(t/.3,1)*np.minimum((DUR-t)/1.1,1);out*=fade[:,None]
 out=np.tanh(out*1.8)*.7
 with wave.open(str(path),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((out*32767).astype('<i2').tobytes())

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,default=ROOT/'exports');ap.add_argument('--episode');ap.add_argument('--frames',action='store_true');args=ap.parse_args();args.out.mkdir(parents=True,exist_ok=True)
 audio=args.out/'original-score.wav';music(audio)
 for ep in CFG['episodes']:
  if args.episode and ep['id']!=args.episode:continue
  for s in ep['scenes']:scene_layer(ep,s,True)
  violations=[b for b in BOUNDS if b[1]<95 or b[3]>985 or b[2]<250 or b[4]>1510]
  if violations:raise ValueError(violations)
  if args.frames:
   for i,s in enumerate(ep['scenes']):frame(ep,round((s['start']+.9)*FPS)).save(args.out/f"{ep['id']}-{i}.jpg")
  dest=args.out/(ep['id']+'.mp4')
  cmd=[FFMPEG,'-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(audio),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-t',str(DUR),str(dest)]
  proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
  try:
   for n in range(int(DUR*FPS)):proc.stdin.write(frame(ep,n).tobytes())
   proc.stdin.close();code=proc.wait()
   if code:raise RuntimeError(code)
  finally:
   if proc.poll() is None:proc.terminate()
  (args.out/(ep['id']+'.txt')).write_text(ep['caption']+'\n\nMot-clé : ESTIMATION\nDestination : Instagram — Trial Reel uniquement\nPartage automatique vers tous : désactivé\n')
  print(json.dumps({'file':dest.name,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()},ensure_ascii=False),flush=True)
 (args.out/'text-bounds.json').write_text(json.dumps(BOUNDS,ensure_ascii=False))
if __name__=='__main__':main()
