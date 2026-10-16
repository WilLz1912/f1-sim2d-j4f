import sys,re
for f in sys.argv[1:]:
    laps=[]; sess=None
    for l in open(f):
        if l.startswith("SESSION"): sess=l.split()[1]
        m=re.match(r"LAP (Q\d) (\w+) (\d+):(\d+\.\d+) imp=([\d.]+) by=(\S*) ersEnd=([\d.]+)",l)
        if m:
            t=int(m.group(3))*60+float(m.group(4)); laps.append((m.group(1),m.group(2),t,float(m.group(5)),m.group(6),float(m.group(7))))
    best={}
    for q,d,t,*_ in laps: best[d]=min(best.get(d,1e9),t)
    print("==",f)
    for q in ["Q1","Q2","Q3"]:
        L=[x for x in laps if x[0]==q]
        comp=[x for x in L if x[2]>best[x[1]]+1.0]
        sb=sorted(set(min(y[2] for y in L if y[1]==d) for d in set(x[1] for x in L)))
        print(q,"laps",len(L),"comp>1s",len(comp),"best",round(min(x[2] for x in L),3) if L else "-", " ".join(f"{x[1]}+{x[2]-best[x[1]]:.1f}({x[3]:.0f},{x[4]})" for x in comp))
