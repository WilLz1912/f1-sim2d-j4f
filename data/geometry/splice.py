import json,math,sys
# --- TUM (5 m, smoothed, pre-2023 layout with the T14-T15 chicane)
T=[tuple(map(float,l.split(',')[:2])) for l in open('dl_tum/Catalunya.csv') if not l.startswith('#')]
# --- bacinger (current layout, coarse) -> metres
d=json.load(open('dl_geo/es-1991.geojson')); co=d['features'][0]['geometry']['coordinates']
lat0=sum(c[1] for c in co)/len(co); lon0=sum(c[0] for c in co)/len(co); R=6371000
B=[((lo-lon0)*math.cos(math.radians(lat0))*math.pi/180*R,(la-lat0)*math.pi/180*R) for lo,la in co][:-1]
def dens(P,step):
    n=len(P); out=[]
    for i in range(n):
        p,q=P[i],P[(i+1)%n]; m=max(1,int(math.dist(p,q)/step))
        for k in range(m): out.append((p[0]+(q[0]-p[0])*k/m,p[1]+(q[1]-p[1])*k/m))
    return out
Bd=dens(B,2.0)
def cen(P): return (sum(p[0] for p in P)/len(P),sum(p[1] for p in P)/len(P))
# grid for nearest queries on T
def nn_err(Ptr,Q,step=1):
    s=0;n=0
    for p in Ptr[::step]:
        s+=min(math.dist(p,q) for q in Q[::2]); n+=1
    return s/n
cT=cen(T); cB=cen(Bd)
best=None
Bs=Bd[::25]
for deg in range(0,360,3):
  a=math.radians(deg); ca,sa=math.cos(a),math.sin(a)
  for mir in (1,):
    X=[((p[0]-cB[0])*ca-(p[1]-cB[1])*sa+cT[0],(p[0]-cB[0])*sa+(p[1]-cB[1])*ca+cT[1]) for p in Bs]
    e=nn_err(X,T,1)
    if best is None or e<best[0]: best=(e,deg)
print("coarse",best)
# refine: rotation +-3 deg, translation +-30 m
e0,deg0=best; bestR=(e0,deg0,0,0)
for dd in [x*0.25 for x in range(-12,13)]:
  a=math.radians(deg0+dd); ca,sa=math.cos(a),math.sin(a)
  X0=[((p[0]-cB[0])*ca-(p[1]-cB[1])*sa+cT[0],(p[0]-cB[0])*sa+(p[1]-cB[1])*ca+cT[1]) for p in Bs]
  for tx in range(-30,31,3):
    for ty in range(-30,31,3):
      X=[(x+tx,y+ty) for x,y in X0]
      e=nn_err(X,T,2)
      if e<bestR[0]: bestR=(e,deg0+dd,tx,ty)
print("refined",bestR)
e,deg,tx,ty=bestR; a=math.radians(deg); ca,sa=math.cos(a),math.sin(a)
BA=[((p[0]-cB[0])*ca-(p[1]-cB[1])*sa+cT[0]+tx,(p[0]-cB[0])*sa+(p[1]-cB[1])*ca+cT[1]+ty) for p in Bd]
# per-point deviation of TUM from bacinger -> find where layouts differ (the old chicane)
dev=[min(math.dist(p,q) for q in BA[::3]) for p in T]
cum=[0]
for i in range(1,len(T)): cum.append(cum[-1]+math.dist(T[i-1],T[i]))
bad=[i for i,v in enumerate(dev) if v>12]
print("TUM points deviating >12 m:",len(bad), "cum range", (round(cum[bad[0]]),round(cum[bad[-1]])) if bad else None)
json.dump({"T":T,"BA":BA,"dev":dev,"cum":cum},open('splice_dbg.json','w'))
