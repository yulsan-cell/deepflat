"""스튜디오 1 — 설계한 디자이너가 시공까지.
A cut-away room half built: the left wall finished with a window, the back wall going from painted to plasterboard
to bare timber studs, oak boards being laid over the screed. In front, the drafting table with the plan of this
very room; between the table and the site, the designer in a hard hat with the roll of drawings."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studiokit import *
from studiokit import _link

NAME = "studio-build"
NICHE = "#EBD5CB"
W, D, H = 3.2, 2.8, 2.3
T = 0.12

sc, sun_o, s_vec = setup(niche=NICHE)

wall_m = paint("wall_white", "#F2EDE5", vary=0.015)
cap = paint("wall_cap", "#EEF0EA", vary=0.01)
slab = flat("slab", "#EDE6DC", rough=0.9)
screed = paint("screed", "#D9D3C9", rough=0.95, bump=0.35, tile=1.2, vary=0.04)
oakfloor = textured("floor_oak", "laminate_floor_02", tile=2.4, hsv=(0.5, 0.85, 1.12))
stud_m = textured("stud", "white_oak_veneer", tile=0.7, hsv=(0.5, 0.95, 1.08))
gyp = flat("gypsum", "#DAD8D1", rough=0.95)
joint = flat("joint", "#EEECE6", rough=0.95)
base_m = flat("baseboard", "#E9E3D8", rough=0.6)
frame_white = flat("frame_white", "#F3EFE8", rough=0.5)
glass_m = glass()
oak = textured("oak", "oak_veneer_01", tile=0.9)
board_white = flat("board_white", "#F4F1EA", rough=0.6)
plan_m = image_mat("plan", os.path.join(TEX, "plan.png"), rough=0.8)
steel = metal("steel", "#9EA3A6", rough=0.35)
acryl = flat("acrylic", "#BFD0C4", rough=0.15, coat=0.6)
ink = flat("ink", "#2E2C29", rough=0.5)
sage_lid = flat("sage_lid", "#8FA597", rough=0.45)
pail = flat("pail_white", "#F1EEE8", rough=0.4)
paint_sage = flat("paint_sage", "#9DB3A2", rough=0.3)

# ---------- floor: screed, with oak boards laid over the left part ----------
plinth(W, D, screed, slab)
OAK_X = 1.45
box("oak_floor", 0, OAK_X, 0, D, 0, 0.014, oakfloor, uv=True)
for i, (x0, l) in enumerate([(OAK_X, 0.9), (OAK_X, 0.55)]):   # two boards still loose at the edge
    yy = 0.35 + i * 0.2
    box("loose_board", x0 + 0.08, x0 + 0.08 + l, yy, yy + 0.18, 0.0, 0.014, oakfloor, bevel=0.002, uv=True, grain='x')
# a small stack of boards waiting
for k in range(4):
    box("stack", 2.55, 3.05, 0.25 + k * 0.004, 0.43 + k * 0.004, k * 0.016, k * 0.016 + 0.015, oakfloor, bevel=0.002, uv=True, grain='x')

# ---------- left wall: finished, with a window ----------
lw = wall("wall_left", -T, 0, 0, D + 0.1, H, wall_m, cap)
WY0, WY1 = 0.75, 1.75
cut = box("c", -T - 0.1, 0.1, WY0, WY1, 0.85, 1.95)
boolean_cut(lw, [cut], wall_m)
box_uv(lw)
window('left', WY0, WY1, 0.85, 1.95, frame_white, glass_m, t=T, sill_mat=frame_white, mullions=1)
box("base_l", 0, 0.012, 0, D, 0.014, 0.09, base_m, bevel=0.002)

# ---------- back wall: painted -> plasterboard -> bare studs ----------
SD = 0.09   # stud depth (y)
SY = D      # inner face of the frame
# bottom and top plates, studs every 40 cm, a noggin row
box("plate_b", 0, W, SY, SY + SD, 0, 0.045, stud_m, bevel=0.002, uv=True, grain='x')
box("plate_t", 0, W, SY, SY + SD, H - 0.09, H, stud_m, bevel=0.002, uv=True, grain='x')
xs = [0.0]
while xs[-1] + 0.4 < W - 0.05:
    xs.append(xs[-1] + 0.4)
xs.append(W - 0.045)
for x in xs:
    box("stud", x, x + 0.045, SY + 0.002, SY + SD - 0.002, 0.045, H - 0.09, stud_m, bevel=0.002, uv=True, grain='z')
for a, b in zip(xs[:-1], xs[1:]):
    if a >= 1.55:
        box("noggin", a + 0.045, b, SY + 0.004, SY + SD - 0.004, 1.15, 1.195, stud_m, bevel=0.002, uv=True, grain='x')
# finished part (paint over board) and plasterboard part, on the room side of the studs
box("back_paint", 0, 0.8, SY - 0.013, SY - 0.001, 0.0, H - 0.001, wall_m, uv=True)
box("back_board", 0.8, 1.6, SY - 0.012, SY - 0.002, 0.0, H - 0.003, gyp, uv=True)
box("board_joint", 1.17, 1.23, SY - 0.0135, SY - 0.0115, 0.02, H - 0.02, joint)
for zz in (0.6, 1.2, 1.8):
    box("board_joint_h", 0.82, 1.58, SY - 0.0134, SY - 0.0116, zz - 0.012, zz + 0.012, joint)
box("base_b", 0, 0.8, SY - 0.025, SY - 0.013, 0.014, 0.09, base_m, bevel=0.002)
# ---------- step ladder by the studs ----------
LH = 1.35
lad = []
for sx in (-1, 1):
    lad.append(rod("rail_f", (sx * 0.2, -0.32, 0), (sx * 0.17, 0.0, LH), 0.022, oak, 12))
    lad.append(rod("rail_b", (sx * 0.2, 0.34, 0), (sx * 0.17, 0.03, LH - 0.03), 0.018, oak, 12))
for i in range(1, 4):
    t = i / 4
    z = LH * t
    yy = -0.32 + 0.32 * t
    lad.append(box("step", -0.2 + 0.03 * t, 0.2 - 0.03 * t, yy - 0.06, yy + 0.06, z - 0.02, z, oak, bevel=0.004, uv=True, grain='x'))
lad.append(box("cap", -0.21, 0.21, -0.08, 0.1, LH - 0.005, LH + 0.035, oak, bevel=0.006, uv=True, grain='x'))
place(lad, (2.75, SY - 0.55, 0), 90, "ladder")

# ---------- paint pail and roller on the screed ----------
cyl("pail", 0.15, 0, 0.3, 2.35, 1.0, pail, 48, r2=0.165, bevel=0.006)
cyl("pail_lid", 0.172, 0.3, 0.32, 2.35, 1.0, sage_lid, 48, bevel=0.005)
tray = rbox("tray", 0.38, 0.5, 0.0, 0.06, pail, r=0.03, edge=0.006, cx=2.8, cy=1.2)
tp = rbox("tray_paint", 0.3, 0.3, 0.045, 0.062, paint_sage, r=0.03, edge=0.004, cx=2.8, cy=1.13)
rod("roller_cover", (2.64, 1.3, 0.1), (2.96, 1.3, 0.1), 0.05, paint_sage, 24)
tube_curve("roller_frame", [(2.64, 1.3, 0.1), (2.6, 1.3, 0.1), (2.6, 1.42, 0.13), (2.72, 1.58, 0.16)], 0.008, steel)
rod("roller_handle", (2.72, 1.58, 0.16), (2.84, 1.8, 0.21), 0.02, ink, 16)

# ---------- the drafting table with the plan of this room ----------
TW, TD, TZ, TILT = 1.25, 0.85, 0.92, 18
top_parts = []
top_parts.append(rbox("dt_top", TW, TD, -0.016, 0.016, board_white, r=0.01, edge=0.004))
edge = box("dt_edge", -TW / 2, TW / 2, -TD / 2 - 0.02, -TD / 2 + 0.005, -0.02, 0.03, oak, bevel=0.003, uv=True, grain='x')
top_parts.append(edge)
# the plan sheet (UV 0..1)
me = bpy.data.meshes.new("plan_sheet")
bm = bmesh.new()
sw, sh = 1.05, 0.75
vs = [bm.verts.new(v) for v in [(-sw / 2, -sh / 2, 0), (sw / 2, -sh / 2, 0), (sw / 2, sh / 2, 0), (-sw / 2, sh / 2, 0)]]
f = bm.faces.new(vs)
uvl = bm.loops.layers.uv.new("UVMap")
for loop, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
    loop[uvl].uv = uv
bm.to_mesh(me); bm.free()
sheet = bpy.data.objects.new("plan_sheet", me)
_link(sheet)
sheet.location = (0.0, 0.02, 0.0175)
sheet.data.materials.append(plan_m)
top_parts.append(sheet)
# parallel rule, triangle, pencil
top_parts.append(box("rule", -TW / 2 + 0.02, TW / 2 - 0.02, -0.39, -0.36, 0.016, 0.03, acryl, bevel=0.003))
tri = bpy.data.meshes.new("tri")
bm = bmesh.new()
tv = [bm.verts.new(v) for v in [(0, 0, 0), (0.26, 0, 0), (0, 0.2, 0)]]
bm.faces.new(tv)
bm.to_mesh(tri); bm.free()
trio = bpy.data.objects.new("triangle", tri)
_link(trio)
trio.data.materials.append(acryl)
sol = trio.modifiers.new("s", 'SOLIDIFY'); sol.thickness = 0.006
apply_mods(trio)
trio.location = (0.3, -0.33, 0.031)
top_parts.append(trio)
top_parts.append(rod("pencil", (-0.42, -0.4, 0.04), (-0.2, -0.43, 0.04), 0.008, ink, 12))
tg = bpy.data.objects.new("dt_top_group", None)
_link(tg)
for o in top_parts:
    o.parent = tg
tg.rotation_euler = (math.radians(TILT), 0, 0)
tg.location = (0, 0, TZ)
legs = [tg]
for sx in (-1, 1):
    x = sx * (TW / 2 - 0.08)
    legs.append(rod("dt_leg", (x, -0.3, 0), (x, -0.03, TZ - 0.05), 0.022, oak, 14))
    legs.append(rod("dt_leg", (x, 0.3, 0), (x, 0.03, TZ - 0.05), 0.022, oak, 14))
    legs.append(rod("dt_foot", (x, -0.33, 0.02), (x, 0.33, 0.02), 0.02, oak, 14))
legs.append(rod("dt_bar", (-(TW / 2 - 0.08), 0, 0.3), (TW / 2 - 0.08, 0, 0.3), 0.018, oak, 14))
place(legs, (0.85, 0.75, 0), 22, "drafting_table")
# a stool by the table
stool = [cyl("st_seat", 0.17, 0.62, 0.66, 0, 0, oak, 40, bevel=0.008)]
for k in range(3):
    a = math.radians(90 + k * 120)
    stool.append(rod("st_leg", (0.2 * math.cos(a), 0.2 * math.sin(a), 0), (0.1 * math.cos(a), 0.1 * math.sin(a), 0.62), 0.016, oak, 12))
place(stool, (0.45, 1.45, 0), 0, "stool")

# ---------- the designer, between the drawing and the site ----------
figure(1.75, 1.15, rot=38)

pts = [Vector(p) for p in [(-T, 0, -0.16), (W, 0, -0.16), (W, D + SD, -0.16), (-T, D + 0.1, -0.16),
                           (-T, 0, H), (-T, D + 0.1, H), (W, D + SD, H)]]
portrait_camera(pts, width=float(arg("wf", 0.86)), bottom=float(arg("bf", 0.9)))
probes({"wall_lit": (0.0, 2.2, 1.6), "studs": (2.6, D, 1.6), "plan": (0.85, 0.75, 0.95)})
finish(NAME)
