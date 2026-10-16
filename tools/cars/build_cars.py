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
    "livery": {"body": "#1F242B", "sidepod": "#00F5D4", "wing": "#C8D0D8", "halo": "#111111"}, "code3": "MER"},
  "ferrari": {"car": "Ferrari SF-26", "entrant": "Scuderia Ferrari HP", "pu": "Ferrari", "gearbox": "Ferrari",
    "mass_kg": [770, "team/wiki (incl. driver, coolant, oil)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "team/wiki + press"},
    "livery": {"body": "#E80020", "sidepod": "#B80018", "wing": "#FFFFFF", "halo": "#111111"}, "code3": "FER"},
  "mclaren": {"car": "McLaren MCL40", "entrant": "McLaren F1 Team", "pu": "Mercedes", "gearbox": "McLaren",
    "mass_kg": [770, "estimate (not published)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "unknown", "rear": "unknown", "src": "not confirmed in sources found"},
    "livery": {"body": "#FF8000", "sidepod": "#181B20", "wing": "#FF8000", "halo": "#111111"}, "code3": "MCL"},
  "redbull": {"car": "Red Bull RB22", "entrant": "Oracle Red Bull Racing", "pu": "Red Bull Ford", "gearbox": "Red Bull",
    "mass_kg": [770, "team/wiki (incl. driver, coolant, oil)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod (wiki) / pushrod (press) - conflict", "rear": "pushrod", "src": "team/wiki vs press"},
    "livery": {"body": "#121F45", "sidepod": "#0B132B", "wing": "#CC1E4A", "halo": "#121F45", "noseTip": "#FFCC00"}, "code3": "RBR"},
  "williams": {"car": "Williams FW48", "entrant": "Atlassian Williams Racing", "pu": "Mercedes", "gearbox": "Mercedes",
    "mass_kg": [772.4, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod", "rear": "pushrod", "src": "team/wiki + press"},
    "livery": {"body": "#005AFF", "sidepod": "#041E42", "wing": "#00A3E0", "halo": "#005AFF"}, "code3": "WIL"},
  "vcarb": {"car": "Racing Bulls VCARB 03", "entrant": "Visa Cash App Racing Bulls", "pu": "Red Bull Ford", "gearbox": "Red Bull Technology",
    "mass_kg": [770, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "team/wiki"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "press"},
    "livery": {"body": "#1634CB", "sidepod": "#FFFFFF", "wing": "#E10600", "halo": "#FFFFFF"}, "code3": "VRB"},
  "aston": {"car": "Aston Martin AMR26", "entrant": "Aston Martin Aramco F1 Team", "pu": "Honda", "gearbox": "Aston Martin",
    "mass_kg": [770, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "press"},
    "livery": {"body": "#00665E", "sidepod": "#004B45", "wing": "#CEDC00", "halo": "#111111"}, "code3": "AST"},
  "haas": {"car": "Haas VF-26", "entrant": "TGR Haas F1 Team", "pu": "Ferrari", "gearbox": "Ferrari",
    "mass_kg": [770, "team/wiki (incl. driver, no fuel)"], "wheelbase_mm": [3400, "team/wiki"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "press"},
    "livery": {"body": "#1A1D24", "sidepod": "#FFFFFF", "wing": "#E6002B", "halo": "#111111"}, "code3": "HAA"},
  "audi": {"car": "Audi R26", "entrant": "Audi F1 Team", "pu": "Audi", "gearbox": "Audi",
    "mass_kg": [770, "team/wiki"], "wheelbase_mm": [3400, "team/wiki"], "length_mm": [5440, "team/wiki"],
    "susp": {"front": "pushrod", "rear": "pushrod", "src": "team/wiki + press"},
    "livery": {"body": "#C0C6CC", "sidepod": "#141619", "wing": "#F50537", "halo": "#111111"}, "code3": "AUD"},
  "alpine": {"car": "Alpine A526", "entrant": "BWT Alpine F1 Team", "pu": "Mercedes", "gearbox": "Mercedes",
    "mass_kg": [770, "team/wiki (incl. driver, coolant, oil)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod", "rear": "pushrod (wiki) / pullrod (press) - conflict", "src": "team/wiki vs press"},
    "livery": {"body": "#0078FF", "sidepod": "#FF5CA8", "wing": "#181B20", "halo": "#111111"}, "code3": "ALP"},
  "cadillac": {"car": "Cadillac MAC-26", "entrant": "Cadillac Formula 1 Team", "pu": "Ferrari", "gearbox": "Ferrari",
    "mass_kg": [770, "estimate (not published)"], "wheelbase_mm": [3400, "estimate"], "length_mm": [5480, "estimate"],
    "susp": {"front": "pullrod", "rear": "pullrod", "src": "press"},
    "livery": {"body": "#141824", "sidepod": "#D4AF37", "wing": "#0046AD", "halo": "#D4AF37"}, "code3": "CAD"},
}
OPENF1_TEAM = {"Mercedes": "mercedes", "Ferrari": "ferrari", "McLaren": "mclaren", "Red Bull Racing": "redbull", "Williams": "williams",
               "Racing Bulls": "vcarb", "Aston Martin": "aston", "Haas F1 Team": "haas", "Audi": "audi", "Alpine": "alpine", "Cadillac": "cadillac"}

HELMET = {"NOR": "#CCFF00", "PIA": "#38BDF8", "RUS": "#00F0FF", "ANT": "#10B981", "LEC": "#FF1801", "HAM": "#FACC15", "VER": "#FF6B00", "HAD": "#FACC15", "SAI": "#EF4444", "ALB": "#F472B6", "ALO": "#38BDF8", "STR": "#065F46", "GAS": "#60A5FA", "COL": "#38BDF8", "LAW": "#F87171", "LIN": "#FACC15", "OCO": "#EF4444", "BEA": "#34D399", "HUL": "#A3E635", "BOR": "#22C55E", "PER": "#FACC15", "BOT": "#38BDF8"}
drivers = json.load(open("data/openf1/s11303_drivers.json")); targets = json.load(open("data/cars/barcelona_2026_q_targets.json"))
out_drivers = []
for d in sorted(drivers, key=lambda x: x["driver_number"]):
    out_drivers.append({"code": d["name_acronym"], "name": d["full_name"].title(), "num": d["driver_number"],
                        "team": OPENF1_TEAM[d["team_name"]], "helmet": HELMET[d["name_acronym"]], "src": "openf1 (2026 Barcelona GP entry list); helmet colour v11"})
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
        "suspension": t["susp"], "livery": dict(t["livery"], src="v11 (Argon)"),
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
