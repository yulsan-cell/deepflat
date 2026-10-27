"""스튜디오 3 — 조명과 마감재.
A lit opal-glass pendant hangs over an oak table where the finishes are laid out: a sample board standing at the
back (oak, marble, terrazzo, linen, three paint chips), and in front a fan of paint chips, a stack of tiles, an oak
plank and a folded linen swatch. The pendant's warm pool of light falls on the samples."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studiokit import *
from studiokit import _link

NAME = "studio-light"
NICHE = "#EADFCD"

sc, sun_o, s_vec = setup(niche=NICHE, ground_z=0.0, sun_e=float(arg("sun", 2.8)), world_k=float(arg("world", 0.5)))

oak = textured("oak", "oak_veneer_01", tile=0.9)
oak_light = textured("oak_light", "white_oak_veneer", tile=0.5)
walnut = textured("walnut", "oak_veneer_01", tile=0.5, tint="#8E6A50", hsv=(0.5, 0.95, 0.85), coat=0.1)
marble = stone_white("marble", base="#F1EEE9", vein="#AFA89E", rough=0.2)
for n in marble.node_tree.nodes:
    if n.type == 'MAPPING':
        n.inputs['Scale'].default_value = (5.0, 2.8, 5.0)
terrazzo = textured("terrazzo", "terrazzo_tiles", tile=0.4, hsv=(0.5, 0.55, 1.12))
linen = fabric("linen", "#D6B3A4", nor=1.6, tile=0.05)
boucle = fabric("boucle", "#EDE6DA", nor=1.2, tile=0.1, normal_tex="wool_boucle")
brass = metal("brass", "#C29A62", rough=0.3)
cord_m = flat("cord", "#3B3934", rough=0.6)
board_m = flat("board", "#F3EFE7", rough=0.85)
tile_m = flat("tile_white", "#F4F2ED", rough=0.18, coat=0.4)
tile_sage = flat("tile_sage", "#7F978A", rough=0.3, coat=0.15)
grout = flat("grout", "#CFC9BE", rough=0.9)
chips = [flat("chip%d" % i, c, rough=0.6) for i, c in enumerate(["#E5C3B6", "#93A99A", "#D9CFBF", "#C29B78", "#5E5A53"])]

# ---------- a low display plinth (cream stone, like the rooms' slabs) ----------
PL_X, PL_Y, PL_Z = 0.74, 1.08, 0.16
X0, Y0 = 0.0, 0.0
stone = paint("plinth_stone", "#EDE6DC", rough=0.85, bump=0.15, vary=0.02)
rbox("plinth", PL_X, PL_Y, 0, PL_Z, stone, r=0.02, edge=0.01, cx=X0 + PL_X / 2, cy=Y0 + PL_Y / 2)
TZ = PL_Z

# ---------- the sample board, standing at the back of the plinth, facing the viewer (+x) ----------
BW_, BH_ = 0.92, 0.7
bparts = [rbox("sample_board", BW_, 0.022, 0, BH_, board_m, r=0.012, edge=0.004)]
def swatch(name, u0, u1, v0, v1, mat, t=0.012, bev=0.002):
    return box(name, u0, u1, -0.011 - t, -0.011, v0, v1, mat, bevel=bev, uv=True)
m = 0.035
cw_ = (BW_ - 4 * m) / 3
rh = 0.22
cols = [-BW_ / 2 + m + k * (cw_ + m) for k in range(3)]
top_v0 = BH_ - m - rh
mid_v0 = top_v0 - m - rh
for (u0, mat, nm, t) in zip(cols, [oak_light, marble, terrazzo], ["sw_oak", "sw_marble", "sw_terrazzo"], [0.016, 0.014, 0.014]):
    bparts.append(swatch(nm, u0, u0 + cw_, top_v0, top_v0 + rh, mat, t=t))
for (u0, mat, nm, t, bev) in zip(cols, [linen, walnut, tile_m], ["sw_linen", "sw_walnut", "sw_tile"], [0.01, 0.014, 0.012], [0.004, 0.002, 0.002]):
    bparts.append(swatch(nm, u0, u0 + cw_, mid_v0, mid_v0 + rh, mat, t=t, bev=bev))
# grout lines on the tile swatch
u0 = cols[2]
for k in (1, 2):
    bparts.append(box("grout", u0 + k * cw_ / 3 - 0.002, u0 + k * cw_ / 3 + 0.002, -0.011 - 0.0125, -0.011 - 0.0115, mid_v0 + 0.004, mid_v0 + rh - 0.004, grout))
    bparts.append(box("grout", u0 + 0.004, u0 + cw_ - 0.004, -0.011 - 0.0125, -0.011 - 0.0115, mid_v0 + k * rh / 3 - 0.002, mid_v0 + k * rh / 3 + 0.002, grout))
cwc = (BW_ - 2 * m - 4 * 0.02) / 5
for k in range(5):
    u = -BW_ / 2 + m + k * (cwc + 0.02)
    bparts.append(swatch("sw_chip", u, u + cwc, m * 0.8, mid_v0 - m * 0.8, chips[k], t=0.006, bev=0.001))
bg_ = bpy.data.objects.new("board_tilt", None)
_link(bg_)
for o in bparts:
    o.parent = bg_
bg_.rotation_euler = (math.radians(-12), 0, 0)
stand = [bg_, box("board_ledge", -BW_ / 2, BW_ / 2, -0.06, 0.0, 0, 0.02, oak, bevel=0.003, uv=True, grain='x')]
place(stand, (X0 + 0.14, Y0 + PL_Y / 2, TZ), 90, "sample_board")

# ---------- loose samples in front ----------
for k, c in enumerate(reversed(chips)):
    ch_ = box("fan_chip", -0.035, 0.035, 0, 0.3, 0, 0.004, c, bevel=0.001)
    ch_.location = (X0 + 0.6, Y0 + 0.12, TZ + 0.002 + k * 0.0042)
    ch_.rotation_euler = (0, 0, math.radians(-10 + k * 17))
rod("fan_pin", (X0 + 0.6, Y0 + 0.12, TZ), (X0 + 0.6, Y0 + 0.12, TZ + 0.028), 0.011, brass, 16)
for k in range(3):
    t = box("tile", -0.1, 0.1, -0.1, 0.1, 0, 0.018, tile_sage if k == 2 else tile_m, bevel=0.0025)
    t.location = (X0 + 0.5, Y0 + 0.56, TZ + k * 0.02); t.rotation_euler = (0, 0, math.radians(8 - k * 5))
pl = box("plank", -0.065, 0.065, -0.2, 0.2, 0, 0.024, oak_light, bevel=0.003, uv=True, grain='y')
pl.location = (X0 + 0.52, Y0 + 0.9, TZ); pl.rotation_euler = (0, 0, math.radians(-12))
fs = rbox("fabric_fold", 0.16, 0.2, TZ, TZ + 0.035, boucle, r=0.025, edge=0.014, cx=X0 + 0.32, cy=Y0 + 0.2)

# ---------- the pendant: opal globe, brass cap, cord up out of the frame ----------
PX, PY = X0 + PL_X * float(arg("px", 0.72)), Y0 + PL_Y * float(arg("py", 0.55))
PZ = float(arg("pz", 1.12))
GR = 0.11
glow = bpy.data.materials.new("opal_glow")
glow.use_nodes = True
b = next(n for n in glow.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
b.inputs['Base Color'].default_value = rgba("#FFF4E2")
b.inputs['Roughness'].default_value = 0.35
b.inputs['Emission Color'].default_value = rgba("#FFE7C8")
b.inputs['Emission Strength'].default_value = float(arg("glow", 1.8))
globe = sphere("globe", GR, (PX, PY, PZ), glow, 48)
globe.visible_shadow = False
cyl("cap", 0.05, PZ + GR * 0.86, PZ + GR + 0.05, PX, PY, brass, 32, r2=0.035, bevel=0.004)
rod("cord", (PX, PY, PZ + GR + 0.05), (PX, PY, PZ + 6.0), 0.006, cord_m, 10)
# the light inside the globe: a warm point light + a soft spot aimed at the table for the pool
pl_d = bpy.data.lights.new("pendant", 'POINT')
pl_d.energy = float(arg("pe", 10))
pl_d.color = srgb("#FFE2BC")
pl_d.shadow_soft_size = 0.1
po = bpy.data.objects.new("pendant", pl_d)
sc.collection.objects.link(po)
po.location = (PX, PY, PZ - 0.02)
sp_d = bpy.data.lights.new("pool", 'SPOT')
sp_d.energy = float(arg("se", 26))
sp_d.color = srgb("#FFE6C6")
sp_d.spot_size = math.radians(float(arg("spot", 75)))
sp_d.spot_blend = 0.85
sp_d.shadow_soft_size = 0.12
so = bpy.data.objects.new("pool", sp_d)
sc.collection.objects.link(so)
so.location = (PX, PY, PZ - GR - 0.01)
aim = Vector((X0 + 0.3, Y0 + PL_Y * 0.5, TZ + 0.3)) - Vector(so.location)
so.rotation_euler = aim.to_track_quat('-Z', 'Y').to_euler()

pts = [Vector(p) for p in [(X0, Y0, 0), (X0 + PL_X, Y0, 0), (X0 + PL_X, Y0 + PL_Y, 0),
                           (X0, Y0 + PL_Y, 0), (X0, Y0 + PL_Y / 2 + BW_ / 2, TZ + BH_), (X0, Y0 + PL_Y / 2 - BW_ / 2, TZ + BH_), (PX, PY, PZ + GR + 0.05)]]
portrait_camera(pts, width=float(arg("wf", 0.76)), bottom=float(arg("bf", 0.86)))
probes({"globe": (PX, PY, PZ)})
finish(NAME)
