import json,math,sys
src,outp=sys.argv[1],sys.argv[2]
d=json.load(open(src))
co=d['features'][0]['geometry']['coordinates']
lat0=sum(c[1] for c in co)/len(co); lon0=sum(c[0] for c in co)/len(co); R=6371000
P=[((lo-lon0)*math.cos(math.radians(lat0))*math.pi/180*R,(la-lat0)*math.pi/180*R) for lo,la in co]
if math.dist(P[0],P[-1])<1: P=P[:-1]
n=len(P)
# 1) linear resample every 2 m around the closed polygon
seg=[math.dist(P[i],P[(i+1)%n]) for i in range(n)]; L=sum(seg)
step=2.0; Q=[]; 
i=0; acc=0.0; t=0.0
while t<L:
    while acc+seg[i]<t: acc+=seg[i]; i+=1
    a=(t-acc)/seg[i]; p,q=P[i],P[(i+1)%n]
    Q.append((p[0]+(q[0]-p[0])*a,p[1]+(q[1]-p[1])*a)); t+=step
N=len(Q)
# 2) Gaussian smoothing (sigma ~ 8 m) to round the polygon kinks, 2 passes
def smooth(Q,sig):
    h=int(3*sig/step); w=[math.exp(-0.5*(k*step/sig)**2) for k in range(-h,h+1)]; ws=sum(w)
    return [(sum(w[k+h]*Q[(j+k)%N][0] for k in range(-h,h+1))/ws, sum(w[k+h]*Q[(j+k)%N][1] for k in range(-h,h+1))/ws) for j in range(N)]
S=smooth(Q,float(sys.argv[3]) if len(sys.argv)>3 else 8.0)
Ls=sum(math.dist(S[j],S[(j+1)%N]) for j in range(N))
# 3) rotate so the main straight (from start back ~300 m to ~ +600 m) is horizontal, travelling right->left
a=S[int(-250/step)%N]; b=S[int(500/step)]
ang=math.atan2(b[1]-a[1],b[0]-a[0])
rot=math.pi-ang   # direction -> pointing to -x
cr,sr=math.cos(rot),math.sin(rot)
T=[(x*cr-y*sr, x*sr+y*cr) for x,y in S]
# canvas: y down. Map y up -> canvas y = -y. Keep clockwise on screen as in reality
T=[(x,-y) for x,y in T]
# straight should be at the bottom of the picture: if most of track is below the straight, flip vertically (mirror would change direction!) -> instead rotate 180 deg
sy=T[0][1]; above=sum(1 for p in T if p[1]<sy)
if above < N/2:
    T=[(-x,-y) for x,y in T]   # 180 deg rotation keeps handedness
# but then straight travels left->right; that's fine either way
# 4) curvature / corners on smoothed line
def curv(j,h=5):
    a,b,c=T[j-h],T[j],T[(j+h)%N]
    ab=math.dist(a,b);bc=math.dist(b,c);ca=math.dist(c,a)
    cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    return 2*cross/(ab*bc*ca) if ab*bc*ca>0 else 0
K=[curv(j) for j in range(N)]
peaks=[]
for j in range(N):
    k=abs(K[j])
    if k>1/400 and all(k>=abs(K[(j+m)%N]) for m in range(-20,21)):
        peaks.append((j*step,round(1/k),'R' if K[j]>0 else 'L'))   # canvas y-down: positive cross = clockwise = right turn
print("length raw",round(L),"smoothed",round(Ls),"points",N)
print("corners (m, radius, dir):",peaks)
json.dump({"pts":T,"step":step},open(outp,"w"))
