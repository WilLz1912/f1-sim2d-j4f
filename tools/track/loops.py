import json, math, collections, itertools
from pyproj import Transformer
d = json.load(open("data/osm/catalunya_raw.json", encoding="utf8"))
tr = Transformer.from_crs("EPSG:4326", "EPSG:25831", always_xy=True)
N = {e["id"]: tr.transform(e["lon"], e["lat"]) for e in d["elements"] if e["type"] == "node"}
W = {e["id"]: e for e in d["elements"] if e["type"] == "way"}
race = {i: w for i, w in W.items() if w.get("tags", {}).get("highway") == "raceway" and w["tags"].get("sport") == "motor" and w["tags"].get("surface") != "unpaved"}
L = {i: sum(math.dist(N[a], N[b]) for a, b in zip(w["nodes"], w["nodes"][1:])) for i, w in race.items()}
out = collections.defaultdict(list)
for i, w in race.items(): out[w["nodes"][0]].append(i)
start = 831804327; res = []
def dfs(node, path, tot):
    if tot > 5200: return
    if node == race[start]["nodes"][0]: res.append((tot, path)); return
    for j in out[node]:
        if j in path: continue
        dfs(race[j]["nodes"][-1], path + [j], tot + L[j])
dfs(race[start]["nodes"][-1], [start], L[start])
for tot, p in sorted(res): print(round(tot), [str(x)[-4:] for x in p])
