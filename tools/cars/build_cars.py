"""Dựng data/cars/cars_2026.json: luật chung 2026, thông số từng xe (công bố hoặc ước tính, có nguồn),
livery (giữ của Argon V11), đội hình tay đua 2026 và mục tiêu hiệu chỉnh thật (phân hạng Barcelona 2026).

Quy ước nguồn: "fia" luật/văn bản FIA, "team/wiki" số đội công bố (qua Wikipedia), "press" báo kỹ thuật,
"openf1" dữ liệu thời gian thật, "v11" giữ từ bản V11 (Argon), "estimate" ước tính hợp lý, cần hiệu chỉnh.
"""
import json

REGS = {
    "min_mass_kg": {"v": 768, "src": "fia", "note": "car + driver, no fuel, nominal tyre mass included"},
    "max_wheelbase_mm": {"v": 3400, "src": "fia"},
    "max_width_mm": {"v": 1900, "src": "fia"},
    "max_height_mm": {"v": 950, "src": "estimate", "note": "~same as 2022-25"},
    "wheel_rim_in": {"v": 18, "src": "fia"},
    "tyre_front": {"width_mm": 280, "diameter_mm": 705, "src": "press (-25 mm width, -15 mm diameter vs 2025); one source says 275 mm"},
    "tyre_rear": {"width_mm": 375, "diameter_mm": 710, "src": "press (-30 mm width, -10 mm diameter vs 2025)"},
    "mguk_max_kw": {"v": 350, "src": "fia"},
    "mguk_taper": {"normal": [290, 355], "overtake": [337, 355], "src": "formula1.com (kept from V11 calibration): full 350 kW up to first km/h value, linear to 0 at second"},
    "ice_kw": {"v": 400, "src": "estimate (2026 ICE ~400 kW widely reported)"},
    "es_usable_mj": {"v": 4.0, "src": "v11 / estimate"},
    "recharge_per_lap_mj": {"race": 8.5, "race_overtake": 9.0, "quali": 7.0, "src": "fia (Barcelona 2026 PU information)"},
    "gears": {"v": 8, "src": "fia"},
    "fuel_start_kg": {"v": 70, "src": "estimate"},
    "aero": {"downforce_vs_2025": -0.30, "drag_vs_2025": -0.55, "modes": ["Z (corner)", "X (straight)"], "src": "fia (announcement)"},
}

# Baseline physical model values, identical for every car until calibrated against the real Q data (M2).
BASE_ESTIMATE = {
    "cog_height_m": 0.28, "front_weight_frac": 0.45, "yaw_inertia_kgm2": 1000,
    "track_front_mm": 1620, "track_rear_mm": 1525,
    "aero_Z": {"ClA_m2": 3.6, "CdA_m2": 1.05, "front_frac": 0.42},
    "aero_X": {"ClA_m2": 1.6, "CdA_m2": 0.62, "front_frac": 0.45},
    "src": "estimate - to be fitted per team in M2 from speed traps and corner minimum speeds",
}

TEAMS = {
  "mercedes": {"car": "Mercedes W17", "entrant": "Mercedes-AMG Petronas F1 Team", "pu": "Mercedes", "gearbox": "Mercedes",
    "mass_kg": [772, "team/wiki (incl. driver, coolant, oil)"], "wheelbase_mm": [3400, "team/wiki"], "length_mm": [5505, "team/wiki"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "team/wiki + press"},
    "livery": {"primary": "#111316", "secondary": "#BFC5CC", "wing": "#111316", "accent": "#00D7B6", "desc": "black with silver star-stripe sidepods, Petronas teal pinstripes"}, "code3": "MER"},
  "ferrari": {"car": "Ferrari SF-26", "entrant": "Scuderia Ferrari HP", "pu": "Ferrari", "gearbox": "Ferrari",
    "mass_kg": [770, "team/wiki (incl. driver, coolant, oil)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "team/wiki + press"},
    "livery": {"primary": "#DC0000", "secondary": "#F2F2F2", "tertiary": "#121212", "wing": "#DC0000", "accent": "#F2F2F2", "desc": "red, white around cockpit and airbox (HP), black rear"}, "code3": "FER"},
  "mclaren": {"car": "McLaren MCL40", "entrant": "McLaren F1 Team", "pu": "Mercedes", "gearbox": "McLaren",
    "mass_kg": [770, "estimate (not published)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "unknown", "rear": "unknown", "src": "not confirmed in sources found"},
    "livery": {"primary": "#FF8000", "secondary": "#1B1C1E", "wing": "#1B1C1E", "accent": "#FF8000", "desc": "papaya front and sidepod tops, anthracite rear body"}, "code3": "MCL"},
  "redbull": {"car": "Red Bull RB22", "entrant": "Oracle Red Bull Racing", "pu": "Red Bull Ford", "gearbox": "Red Bull",
    "mass_kg": [770, "team/wiki (incl. driver, coolant, oil)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod (wiki) / pushrod (press) - conflict", "rear": "pushrod", "src": "team/wiki vs press"},
    "livery": {"primary": "#1B2550", "secondary": "#D8102C", "tertiary": "#FFC906", "wing": "#1B2550", "accent": "#D8102C", "desc": "matte navy, red bulls and yellow sun, red/yellow nose"}, "code3": "RBR"},
  "williams": {"car": "Williams FW48", "entrant": "Atlassian Williams Racing", "pu": "Mercedes", "gearbox": "Mercedes",
    "mass_kg": [772.4, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod", "rear": "pushrod", "src": "team/wiki + press"},
    "livery": {"primary": "#2F86D6", "secondary": "#0A2752", "wing": "#0A2752", "accent": "#FFFFFF", "desc": "mid blue top, navy lower and rear, white Atlassian marks"}, "code3": "WIL"},
  "vcarb": {"car": "Racing Bulls VCARB 03", "entrant": "Visa Cash App Racing Bulls", "pu": "Red Bull Ford", "gearbox": "Red Bull Technology",
    "mass_kg": [770, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "team/wiki"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "press"},
    "livery": {"primary": "#F4F5F7", "secondary": "#1B2A60", "tertiary": "#D8102C", "wing": "#1B2A60", "accent": "#FFC906", "desc": "white, navy lower sidepods and rear, Red Bull logo"}, "code3": "VRB"},
  "aston": {"car": "Aston Martin AMR26", "entrant": "Aston Martin Aramco F1 Team", "pu": "Honda", "gearbox": "Aston Martin",
    "mass_kg": [770, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "press"},
    "livery": {"primary": "#0C5C4C", "secondary": "#C8E000", "wing": "#0C5C4C", "accent": "#C8E000", "desc": "racing green, lime pinstripes"}, "code3": "AST"},
  "haas": {"car": "Haas VF-26", "entrant": "TGR Haas F1 Team", "pu": "Ferrari", "gearbox": "Ferrari",
    "mass_kg": [770, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "team/wiki"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "press"},
    "livery": {"primary": "#F4F4F4", "secondary": "#D9001B", "tertiary": "#151515", "wing": "#151515", "accent": "#D9001B", "desc": "white, big red GR on engine cover, black lower edges"}, "code3": "HAA"},
  "audi": {"car": "Audi R26", "entrant": "Audi F1 Team", "pu": "Audi", "gearbox": "Audi",
    "mass_kg": [770, "team/wiki"], "wheelbase_mm": [3400, "team/wiki"], "length_mm": [5440, "team/wiki"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "team/wiki + press"},
    "livery": {"primary": "#A9AEB4", "secondary": "#E8261C", "tertiary": "#141414", "wing": "#141414", "accent": "#E8261C", "desc": "titanium silver, lava-red rear sidepods, black engine cover"}, "code3": "AUD"},
  "alpine": {"car": "Alpine A526", "entrant": "BWT Alpine F1 Team", "pu": "Mercedes", "gearbox": "Mercedes",
    "mass_kg": [770, "team/wiki (incl. driver, coolant, oil)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod", "rear": "pushrod (wiki) / pullrod (press) - conflict", "src": "team/wiki vs press"},
    "livery": {"primary": "#FF8CC6", "secondary": "#1E5BC6", "wing": "#1E5BC6", "accent": "#FFFFFF", "desc": "pink front and sidepods, blue engine cover and rear, white BWT"}, "code3": "ALP"},
  "cadillac": {"car": "Cadillac MAC-26", "entrant": "Cadillac Formula 1 Team", "pu": "Ferrari", "gearbox": "Ferrari",
    "mass_kg": [770, "estimate (not published)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod", "rear": "pullrod", "src": "press"},
    "livery": {"primary": "#E6E7EA", "secondary": "#0F1013", "wing": "#0F1013", "accent": "#C9CCD1", "desc": "two-sided: grayish-white left flank, black right flank"}, "code3": "CAD"},
}
OPENF1_TEAM = {"Mercedes": "mercedes", "Ferrari": "ferrari", "McLaren": "mclaren", "Red Bull Racing": "redbull", "Williams": "williams",
               "Racing Bulls": "vcarb", "Aston Martin": "aston", "Haas F1 Team": "haas", "Audi": "audi", "Alpine": "alpine", "Cadillac": "cadillac"}

HELMET = {"NOR": {"base": "#D7F70A", "second": "#C0C4CA", "accent": "#111111"}, "PIA": {"base": "#1B2A6B", "second": "#D62828", "accent": "#F5C518"}, "RUS": {"base": "#5BC2E7", "second": "#111111", "accent": "#FFFFFF"}, "ANT": {"base": "#F5F5F5", "second": "#009246", "accent": "#CE2B37"}, "VER": {"base": "#1E2A78", "second": "#D21034", "accent": "#FFFFFF"}, "HAD": {"base": "#FFD400", "second": "#6A2C91", "accent": "#111111"}, "LEC": {"base": "#E8002D", "second": "#FFFFFF", "accent": "#8FD3FF"}, "HAM": {"base": "#FFD100", "second": "#E8002D", "accent": "#FFFFFF"}, "SAI": {"base": "#C60B1E", "second": "#FFC400", "accent": "#005AFF"}, "ALB": {"base": "#E6E8EB", "second": "#A7ADB5", "accent": "#005AFF"}, "LAW": {"base": "#F7F7F7", "second": "#FF6FAE", "accent": "#111111"}, "LIN": {"base": "#39FF14", "second": "#1E5BFF", "accent": "#E10600"}, "ALO": {"base": "#1B3A8A", "second": "#C60B1E", "accent": "#FFC400"}, "STR": {"base": "#121212", "second": "#3A3D42", "accent": "#CEDC00"}, "OCO": {"base": "#D3122B", "second": "#8E0B1C", "accent": "#FFFFFF"}, "BEA": {"base": "#1E50C8", "second": "#FFFFFF", "accent": "#E6FF00"}, "HUL": {"base": "#C9CDD2", "second": "#FF7A00", "accent": "#111111"}, "BOR": {"base": "#009C3B", "second": "#FFDF00", "accent": "#D4AF37"}, "GAS": {"base": "#0047AB", "second": "#FFFFFF", "accent": "#E10600"}, "COL": {"base": "#75AADB", "second": "#FFFFFF", "accent": "#111111"}, "PER": {"base": "#1A1A2E", "second": "#39FF14", "accent": "#CE1126"}, "BOT": {"base": "#2B4C7E", "second": "#111111", "accent": "#8A8F98"}}
TCAM = {"NOR": "yellow", "PIA": "black", "RUS": "black", "ANT": "yellow", "HAM": "yellow", "LEC": "black", "VER": "black", "HAD": "yellow", "SAI": "yellow", "ALB": "black", "BEA": "yellow", "OCO": "black", "ALO": "yellow", "STR": "black", "LAW": "yellow", "LIN": "black", "GAS": "black", "COL": "yellow", "HUL": "black", "BOR": "yellow", "BOT": "yellow", "PER": "black"}
drivers = json.load(open("data/openf1/s11303_drivers.json")); targets = json.load(open("data/cars/barcelona_2026_q_targets.json"))
out_drivers = []
for d in sorted(drivers, key=lambda x: x["driver_number"]):
    out_drivers.append({"code": d["name_acronym"], "name": d["full_name"].title(), "num": d["driver_number"],
                        "team": OPENF1_TEAM[d["team_name"]], "helmet": HELMET[d["name_acronym"]], "tcam": TCAM[d["name_acronym"]],
                        "src": "openf1 (entry list); helmet: 2026 season designs as described by Total Motorsport (colours approximated, PER/PIA/ANT bases estimated); T-cam: Motorsport.com 2026 spotter's guide"})
cars = {}
for key, t in TEAMS.items():
    tg = {k: v for k, v in targets.items() if OPENF1_TEAM[v["team"]] == key}
    best = min(tg.values(), key=lambda r: r["lap"])
    cars[key] = {
        "car": t["car"], "entrant": t["entrant"], "code3": t["code3"], "pu": t["pu"], "gearbox": t["gearbox"],
        "mass_kg": {"v": t["mass_kg"][0], "src": t["mass_kg"][1]},
        "wheelbase_mm": {"v": t["wheelbase_mm"][0], "src": t["wheelbase_mm"][1]},
        "length_mm": {"v": t["length_mm"][0], "src": t["length_mm"][1]},
        "width_mm": {"v": 1900, "src": "fia (max, all teams at the limit)"},
        "suspension": t["susp"], "livery": dict(t["livery"], src="2026 race photos (Wikimedia Commons, FIA F1 Austria 2026) + Motorsport.com spotter's guide; colours picked from photos"),
        "physics": dict(BASE_ESTIMATE),
        "barcelona_2026_q": {"best_driver": [k for k, v in tg.items() if v is best][0], **{k: best[k] for k in
            ("lap", "s1", "s2", "s3", "st", "vmax", "min_T1", "min_T3", "min_T5", "min_T9", "min_T10", "min_T12", "min_T14")}, "src": "openf1"},
    }
json.dump({"season": 2026, "regs": REGS, "teams": cars, "drivers": out_drivers,
           "sources": {"openf1": "api.openf1.org (2026 Barcelona GP, session 11303)", "team/wiki": "team spec sheets as cited on Wikipedia car pages (Oct 2026)",
                       "press": "PlanetF1 / Red Bull Racing / Autosport technical articles on 2026 cars", "fia": "FIA 2026 regulations and Barcelona documents"}},
          open("data/cars/cars_2026.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
gap = {k: round(v["barcelona_2026_q"]["lap"] - min(c["barcelona_2026_q"]["lap"] for c in cars.values()), 3) for k, v in cars.items()}
print("team gap to pole (best car lap):", dict(sorted(gap.items(), key=lambda kv: kv[1])))
