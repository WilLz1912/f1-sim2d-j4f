import json,math
d=json.load(open('splice_dbg.json')); T=[tuple(p) for p in d['T']]; BA=[tuple(p) for p in d['BA']]; cum=d['cum']
N=len(T); NB=len(BA)
def idx_at(c): return min(range(N),key=lambda i:abs(cum[i]-c))
def nearB(p): return min(range(NB),key=lambda j:math.dist(BA[j],p))
# direction check of BA vs T
j0=nearB(T[100]); j1=nearB(T[110]); print("BA forward step",(j1-j0)%NB)
regions=[(3440,3690),(3960,4250)]
out=[];mask=[]
i=0
reg_idx=[(idx_at(a),idx_at(b)) for a,b in regions]
while i<N:
    hit=[r for r in reg_idx if r[0]==i]
    if hit:
        iA,iB=hit[0]; jA=nearB(T[iA]); jB=nearB(T[iB])
        j=jA
        while j!=jB:
            out.append(BA[j]); mask.append(1); j=(j+1)%NB
        i=iB; continue
    out.append(T[i]); mask.append(0); i+=1
# resample at 2 m (closed)
def resample(P,M,step):
    n=len(P); seg=[math.dist(P[k],P[(k+1)%n]) for k in range(n)]; L=sum(seg)
    Q=[];W=[];k=0;acc=0;t=0
    while t<L-1e-9:
        while acc+seg[k]<t: acc+=seg[k]; k+=1
        a=(t-acc)/seg[k] if seg[k]>0 else 0; p,q=P[k],P[(k+1)%n]
        Q.append((p[0]+(q[0]-p[0])*a,p[1]+(q[1]-p[1])*a)); W.append(max(M[k],M[(k+1)%n])); t+=step
    return Q,W,L
Q,W,L0=resample(out,mask,2.0); n=len(Q)
# widen the mask by 40 m each side, then variable-sigma Gaussian smoothing
W2=[max(W[(k+m)%n] for m in range(-20,21)) for k in range(n)]
def gsmooth(Q,sig_of):
    R=[]
    for k in range(n):
        sig=sig_of(k); h=int(3*sig/2.0)
        ws=0;x=0;y=0
        for m in range(-h,h+1):
            w=math.exp(-0.5*(m*2.0/sig)**2); p=Q[(k+m)%n]; x+=w*p[0]; y+=w*p[1]; ws+=w
        R.append((x/ws,y/ws))
    return R
S=gsmooth(Q,lambda k: 9.0 if W2[k] else 2.5)
S=gsmooth(S,lambda k: 6.0 if W2[k] else 1.5)
L=sum(math.dist(S[k],S[(k+1)%n]) for k in range(n)); print("length raw",round(L0),"smoothed",round(L))
# rotate: main straight (from -300 m to +500 m around the start) horizontal, travelling towards -x
a=S[int(-300/2)%n]; b=S[int(500/2)]
ang=math.atan2(b[1]-a[1],b[0]-a[0]); rot=math.pi-ang; cr,sr=math.cos(rot),math.sin(rot)
Rt=[(x*cr-y*sr,x*sr+y*cr) for x,y in S]
Rt=[(x,-y) for x,y in Rt]          # canvas y down (mirror) ...
# a mirror flips handedness; undo by a 180-degree turn if the circuit would run anticlockwise on screen
area=sum(Rt[k][0]*Rt[(k+1)%n][1]-Rt[(k+1)%n][0]*Rt[k][1] for k in range(n))/2
print("signed area (canvas)",round(area))
# straight should sit at the bottom of the picture
sy=Rt[0][1]; above=sum(1 for p in Rt if p[1]<sy)
print("points above start line",above,"of",n)
json.dump({"S":Rt,"cum_step":2.0,"L":L},open('bcn_geo2.json','w'))
