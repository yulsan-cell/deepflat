"""스튜디오 2 — 공정별로 나눈 견적.
An oak sample tray of six compartments, one per trade, in the order of the estimate that stands behind it on an
easel (철거 hammer and brick / 설비 tap and copper pipe / 목공 timber / 전기 cable and switch / 타일 tiles /
도장 paint tin and brush). Each compartment carries the colour of its line's chip on its front edge. A calculator
and a pencil lie beside the tray."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studiokit import *
from studiokit import _link

NAME = "studio-estimate"
NICHE = "#D7E0D9"

sc, sun_o, s_vec = setup(niche=NICHE, ground_z=0.0)

oak = textured("oak", "oak_veneer_01", tile=0.9)
walnut = textured("walnut", "oak_veneer_01", tile=0.9, tint="#8E6A50", hsv=(0.5, 0.95, 0.9), coat=0.1)
tray_in = flat("tray_in", "#E8E1D4", rough=0.9)
steel = metal("steel", "#A7ABAE", rough=0.3)
chrome = metal("chrome", "#E1E4E6", rough=0.08)
copper = metal("copper", "#C07A50", rough=0.3)
brick = flat("brick", "#B76E4E", rough=0.9)
ink = flat("ink", "#2E2C29", rough=0.5)
# a grey-white household cable (2026-10-27: the near-black coil was the darkest mass in the tray and read as a tyre)
cable_ink = flat("cable_ink", "#CFC9BE", rough=0.45)
switch_m = flat("switch", "#F6F4EF", rough=0.3, coat=0.3)
tile_m = flat("tile_white", "#F4F2ED", rough=0.2, coat=0.4)
tile_grey = flat("tile_grey", "#C2BEB6", rough=0.3, coat=0.3)
tin_m = flat("tin", "#F1EEE8", rough=0.35, metal=0.2)
sage_m = flat("sage", "#8FA897", rough=0.4)
blush_m = flat("blush", "#E3B9A8", rough=0.5)
estimate_m = image_mat("estimate", os.path.join(TEX, "estimate.png"), rough=0.8)
calc_m = flat("calc", "#3B3934", rough=0.5)
key_m = flat("key", "#E9E5DD", rough=0.5)
screen_m = flat("screen", "#B9C4B5", rough=0.3)

# ---------- the tray: 2 rows (along x, back to front) x 3 columns (along y, in reading order) ----------
CS = 0.44          # compartment size
WT = 0.035         # outer wall
DV = 0.024         # divider
TH = 0.13          # wall height
BT = 0.03          # base
NX, NY = 2, 3
LX = NX * CS + (NX - 1) * DV + 2 * WT
LY = NY * CS + (NY - 1) * DV + 2 * WT
X0, Y0 = 0.0, 0.0
box("tray_base", X0, X0 + LX, Y0, Y0 + LY, 0, BT, oak, bevel=0.004, uv=True, grain='y')
box("tray_wall", X0, X0 + WT, Y0, Y0 + LY, BT, TH, oak, bevel=0.004, uv=True, grain='y')
box("tray_wall", X0 + LX - WT, X0 + LX, Y0, Y0 + LY, BT, TH, oak, bevel=0.004, uv=True, grain='y')
box("tray_wall", X0 + WT, X0 + LX - WT, Y0, Y0 + WT, BT, TH, oak, bevel=0.004, uv=True, grain='x')
box("tray_wall", X0 + WT, X0 + LX - WT, Y0 + LY - WT, Y0 + LY, BT, TH, oak, bevel=0.004, uv=True, grain='x')
xd = X0 + WT + CS
box("tray_div", xd, xd + DV, Y0 + WT, Y0 + LY - WT, BT, TH - 0.015, oak, bevel=0.003, uv=True, grain='y')
for k in range(1, NY):
    yd = Y0 + WT + k * CS + (k - 1) * DV
    box("tray_div", X0 + WT, X0 + LX - WT, yd, yd + DV, BT, TH - 0.015, oak, bevel=0.003, uv=True, grain='x')
for i in range(NX):
    for j in range(NY):
        cx0 = X0 + WT + i * (CS + DV)
        cy0 = Y0 + WT + j * (CS + DV)
        box("lining", cx0 + 0.004, cx0 + CS - 0.004, cy0 + 0.004, cy0 + CS - 0.004, BT, BT + 0.004, tray_in)


def comp(i, j):
    """floor centre of compartment row i (0 back, 1 front), column j (0..2 along y)"""
    return X0 + WT + i * (CS + DV) + CS / 2, Y0 + WT + j * (CS + DV) + CS / 2, BT + 0.004


# colour tags on the front edge of each compartment (+x faces): the chips of the estimate's lines
CHIPS = [["#8F8778", "#B9C4C8", "#C49A6C"], ["#3B3934", "#E9E6DF", "#9DB3A2"]]   # [row][column]
for i in range(NX):
    for j in range(NY):
        cx, cy, _ = comp(i, j)
        xf = X0 + LX if i == 1 else xd + DV
        top = TH if i == 1 else TH - 0.015
        box("tag", xf - 0.002, xf + 0.004, cy - 0.07, cy + 0.07, top - 0.055, top - 0.02,
            flat("tag%d%d" % (i, j), CHIPS[i][j], rough=0.5), bevel=0.002)

# 철거 (back row, 1st): a club hammer lying over broken bricks
cx, cy, cz = comp(0, 0)
b1 = box("brick", -0.075, 0.075, -0.12, 0.12, 0, 0.08, brick, bevel=0.007)
b1.location = (cx - 0.04, cy - 0.04, cz); b1.rotation_euler = (0, 0, math.radians(8))
b2 = box("brick2", -0.06, 0.06, -0.065, 0.065, 0, 0.075, brick, bevel=0.008)
b2.location = (cx + 0.1, cy + 0.12, cz); b2.rotation_euler = (0, 0, math.radians(-24))
b3 = box("brick3", -0.04, 0.04, -0.035, 0.035, 0, 0.05, brick, bevel=0.008)
b3.location = (cx + 0.12, cy - 0.12, cz); b3.rotation_euler = (0, 0, math.radians(30))
hp = [rod("h_handle", (-0.2, 0, 0), (0.12, 0, 0), 0.019, oak, 16),
      box("h_head", 0.1, 0.17, -0.045, 0.045, -0.045, 0.045, steel, bevel=0.009)]
place(hp, (cx, cy, cz + 0.125), 62, "hammer")

# 설비 (back row, 2nd): a chrome mixer tap on a white block, a copper pipe elbow
cx, cy, cz = comp(0, 1)
rbox("tap_block", 0.16, 0.22, cz, cz + 0.05, switch_m, r=0.02, edge=0.004, cx=cx - 0.07, cy=cy - 0.05)
fp = faucet(0, 0, 0, chrome, reach=0.15, height=0.28)
place(fp, (cx - 0.1, cy - 0.05, cz + 0.05), 90, "tap")
tube_curve("pipe", [(cx + 0.06, cy + 0.15, cz + 0.03), (cx + 0.06, cy + 0.06, cz + 0.03), (cx + 0.1, cy + 0.02, cz + 0.03), (cx + 0.17, cy + 0.02, cz + 0.03)], 0.028, copper)

# 목공 (back row, 3rd): a stack of timber, cross-laid
cx, cy, cz = comp(0, 2)
for k in range(4):
    if k % 2 == 0:
        for dx in (-0.1, 0.0, 0.1):
            box("timber", cx + dx - 0.045, cx + dx + 0.045, cy - 0.18, cy + 0.18, cz + k * 0.05, cz + k * 0.05 + 0.047, oak, bevel=0.004, uv=True, grain='y')
    else:
        for dy in (-0.1, 0.0, 0.1):
            box("timber", cx - 0.18, cx + 0.18, cy + dy - 0.045, cy + dy + 0.045, cz + k * 0.05, cz + k * 0.05 + 0.047, oak, bevel=0.004, uv=True, grain='x')

# 전기 (front row, 1st): a coil of cable and a switch plate
cx, cy, cz = comp(1, 0)
for k in range(3):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.11, minor_radius=0.027, major_segments=48, minor_segments=16,
                                     location=(cx - 0.03, cy - 0.06, cz + 0.027 + k * 0.047))
    tor = bpy.context.active_object
    tor.data.materials.append(cable_ink)
    for p in tor.data.polygons:
        p.use_smooth = True
    _link(tor)
tube_curve("cable_end", [(cx + 0.08, cy - 0.06, cz + 0.12), (cx + 0.13, cy + 0.04, cz + 0.06), (cx + 0.08, cy + 0.12, cz + 0.02)], 0.022, cable_ink)
plate = rbox("switch_plate", 0.15, 0.024, 0, 0.15, switch_m, r=0.014, edge=0.004)
rock = rbox("switch_rocker", 0.07, 0.014, 0.035, 0.115, switch_m, r=0.008, edge=0.003, cy=-0.017)
place([plate, rock], (cx - 0.04, cy + 0.15, cz), 70, "switch")

# 타일 (front row, 2nd): a stack of white tiles, a grey tile leaning on it
cx, cy, cz = comp(1, 1)
for k in range(5):
    t = box("tile", -0.15, 0.15, -0.15, 0.15, 0, 0.019, tile_m, bevel=0.003)
    t.location = (cx - 0.02, cy - 0.03, cz + k * 0.021); t.rotation_euler = (0, 0, math.radians((k - 2) * 2.5))

# 도장 (front row, 3rd): a paint tin with a sage band and a brush
cx, cy, cz = comp(1, 2)
cyl("tin", 0.12, cz, cz + 0.22, cx - 0.04, cy - 0.05, tin_m, 48, bevel=0.004)
cyl("tin_band", 0.1215, cz + 0.07, cz + 0.165, cx - 0.04, cy - 0.05, sage_m, 48)
cyl("tin_lid", 0.122, cz + 0.22, cz + 0.232, cx - 0.04, cy - 0.05, steel, 48, bevel=0.003)
br = [rod("brush_handle", (0, 0, 0), (0.17, 0, 0), 0.015, oak, 14),
      rbox("brush_ferrule", 0.045, 0.08, -0.012, 0.012, steel, r=0.006, edge=0.002, cx=0.19),
      rbox("brush_bristle", 0.07, 0.076, -0.011, 0.011, sage_m, r=0.006, edge=0.004, cx=0.245)]
place(br, (cx - 0.06, cy + 0.03, cz + 0.015), 40, "brush")

# ---------- the estimate on a clipboard, on a small easel behind the tray ----------
CBW, CBH = 0.84, 1.12
cb = rbox("clipboard", CBW, 0.024, 0, CBH, walnut, r=0.035, edge=0.004)
me = bpy.data.meshes.new("estimate_sheet")
bm = bmesh.new()
sw = CBW - 0.08
shh = sw * 4 / 3
z0 = 0.04
vs = [bm.verts.new(v) for v in [(-sw / 2, -0.0135, z0), (sw / 2, -0.0135, z0), (sw / 2, -0.0135, z0 + shh), (-sw / 2, -0.0135, z0 + shh)]]
f = bm.faces.new(vs)
uvl = bm.loops.layers.uv.new("UVMap")
for loop, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
    loop[uvl].uv = uv
bm.to_mesh(me); bm.free()
sheet = bpy.data.objects.new("estimate_sheet", me)
_link(sheet)
sheet.data.materials.append(estimate_m)
clip = rbox("clip", 0.26, 0.035, CBH - 0.09, CBH + 0.015, steel, r=0.012, edge=0.004, cy=-0.016)
board = bpy.data.objects.new("board_tilt", None)
_link(board)
for o in (cb, sheet, clip):
    o.parent = board
LEAN = float(arg("lean", 12))
board.rotation_euler = (math.radians(-LEAN), 0, 0)   # top leans back (+y, away from the sheet's face)
board.location = (0, 0, 0.2)
easel = [board]
for sx in (-1, 1):
    easel.append(rod("easel_leg", (sx * 0.34, 0.06, 0), (sx * 0.26, 0.29, 1.2), 0.017, oak, 12))
easel.append(rod("easel_back", (0, 0.7, 0), (0, 0.32, 1.16), 0.017, oak, 12))
easel.append(box("easel_ledge", -0.47, 0.47, -0.07, 0.0, 0.16, 0.2, oak, bevel=0.004, uv=True, grain='x'))
# the easel sits a little further along the tray (ey .45 -> .62): toward the arch's empty top right, clear of its left curve
place(easel, (X0 - 0.36, Y0 + LY * float(arg("ey", 0.62)), 0), 90, "easel")

# ---------- a calculator and a pencil beside the tray ----------
calc = [rbox("calc_body", 0.2, 0.28, 0, 0.024, calc_m, r=0.022, edge=0.004),
        box("calc_screen", -0.075, 0.075, 0.05, 0.11, 0.024, 0.027, screen_m)]
for r_ in range(4):
    for c_ in range(4):
        calc.append(rbox("key", 0.034, 0.03, 0.024, 0.03, key_m if c_ < 3 else blush_m, r=0.006, edge=0.002,
                         cx=-0.066 + c_ * 0.044, cy=-0.11 + r_ * 0.04))
place(calc, (X0 + LX + 0.26, Y0 + 0.3, 0), 75, "calculator")
rod("pencil", (X0 + LX + 0.2, Y0 + 0.66, 0.008), (X0 + LX + 0.34, Y0 + 0.9, 0.008), 0.008, ink, 12)

pts = [Vector(p) for p in [(X0 - 0.6, Y0 - 0.05, 0), (X0 + LX + 0.42, Y0 - 0.05, 0), (X0 + LX + 0.42, Y0 + LY + 0.05, 0),
                           (X0 - 0.6, Y0 + LY + 0.05, 0), (X0 - 0.45, Y0 + LY * 0.45, 1.38)]]
# framed about 10% tighter than the first render (wf .92), so the set fills the niche like cards 1 and 3
portrait_camera(pts, width=float(arg("wf", 1.06)), bottom=float(arg("bf", 0.9)))
finish(NAME)
