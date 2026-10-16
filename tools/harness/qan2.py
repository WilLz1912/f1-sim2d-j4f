import re,sys
for f in sys.argv[1:]:
    laps=[]
    for l in open(f):
        m=re.match(r"LAP (Q\d) (\w+) (\d+):(\d+\.\d+) imp=([\d.]+) traf=([\d.]+)/(\S*) .*by=(\S*)",l)
        if m: laps.append((m.group(1),m.group(2),int(m.group(3))*60+float(m.group(4)),float(m.group(5)),float(m.group(6)),m.group(7)))
    print("==",f, "pens:", sum(1 for l in open(f) if "grid drop" in l))
    for q in ["Q1","Q2","Q3"]:
        L=[x for x in laps if x[0]==q]
        best={}
        for x in L: best[x[1]]=min(best.get(x[1],1e9),x[2])
        multi=[x for x in L if sum(1 for y in L if y[1]==x[1])>=2]
        comp=[x for x in multi if x[2]>best[x[1]]+0.7]
        notraf=[x for x in comp if x[4]<1]
        print(q,"laps",len(L),"multi",len(multi),"comp>0.7",len(comp),"of which no traffic",len(notraf)," ".join(f"{x[1]}+{x[2]-best[x[1]]:.1f}(i{x[3]:.0f},t{x[4]:.0f},{x[5]})" for x in comp))
        bs=sorted(best.values()) or [0]; print("   best",round(bs[0],2),"10th",round(bs[min(9,len(bs)-1)],2),"last",round(bs[-1],2))
