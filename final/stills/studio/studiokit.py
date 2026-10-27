"""Shared pieces for the three studio illustrations (스튜디오: 설계→시공 / 공정별 견적 / 조명과 마감재).
Built on the carousel kit (rooms/scripts/roomkit.py + furnish.py, imported read-only): same iso camera
(az 50, el 30, orthographic), same daylight (warm sun from the front-left + overcast HDRI), same materials.
Differences: portrait 5:6 frames that cover the page's arched niche, and the output is RGBA (the niche colour
shows through; the floor shadow is composited as a tinted alpha shadow by comp_studio.js)."""
import sys, os, math
KIT = r"C:\Users\joung\AppData\Local\Temp\claude\C--Users-joung-------\459c3502-71df-4eac-810f-eaac68dcd55f\scratchpad\rooms\scripts"
sys.path.insert(0, KIT)
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
import roomkit
from furnish import *
from roomkit import _link, _bsdf

STUDIO = r"C:\Users\joung\AppData\Local\Temp\claude\C--Users-joung-------\459c3502-71df-4eac-810f-eaac68dcd55f\scratchpad\studio"
TEX = os.path.join(STUDIO, "tex")
roomkit.RENDERS = os.path.join(STUDIO, "out")
os.makedirs(roomkit.RENDERS, exist_ok=True)

FW, FH = 1200, 1440   # final frame: 5:6, the niche's aspect


def setup(niche="#EBD5CB", samples=128, exposure=0.18, world_k=0.65, sun_e=4.4, rx=42, rz=-30, ground_z=-0.16):
    sc = fresh()
    setup_render(samples=int(arg("samples", samples)), exposure=float(arg("exp", exposure)), look="None", vt="Khronos PBR Neutral")
    if PREVIEW:
        pw = int(arg("pw", 500))
        sc.render.resolution_x, sc.render.resolution_y = pw, pw * 6 // 5
    else:
        sc.render.resolution_x, sc.render.resolution_y = int(arg("fw", FW)), int(arg("fw", FW)) * 6 // 5
    world(strength=float(arg("world", world_k)), tint="#FFF8EE")
    sun_o, s_vec = sun_euler(rx=rx, rz=rz, energy=sun_e)
    # the ground takes the niche's colour, so the bounce light on the pieces matches the arch they sit in
    g = flat("ground", niche, rough=1.0, spec=0.2)
    box("ground", -60, 60, -60, 60, ground_z - 0.01, ground_z, g)
    return sc, sun_o, s_vec


def portrait_camera(points, az=50, el=30, width=0.8, bottom=0.9, cx_off=0.0):
    """orthographic iso camera; the pieces' projected box takes `width` of the frame width, its lowest point
    sits at `bottom` of the frame height (from the top), centred left-right (+ cx_off of the frame width)"""
    sc = bpy.context.scene
    d, _, _ = cam_basis(az, el)
    cd = bpy.data.cameras.new("cam")
    cd.type = 'ORTHO'
    cd.sensor_fit = 'HORIZONTAL'
    cd.clip_start = 0.1
    cd.clip_end = 400
    cam = bpy.data.objects.new("cam", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    c = sum(points, Vector()) / len(points)
    cam.location = c + d * 60
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    xs, ys = [], []
    for p in points:
        q = inv @ p
        xs.append(q.x); ys.append(q.y)
    w = max(xs) - min(xs)
    Wf = w / float(arg("width", width))
    Hf = Wf * sc.render.resolution_y / sc.render.resolution_x
    cx = (max(xs) + min(xs)) / 2 - cx_off * Wf
    cy = min(ys) + Hf * (float(arg("bottom", bottom)) - 0.5)
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))
    cd.ortho_scale = Wf
    top = (max(ys) - cy) / Hf + 0.5
    print("CAMFIT width %.3f top-from-top %.3f" % (w / Wf, 1 - top))
    return cam


def sphere(name, r, loc, mat, seg=32, scale=(1, 1, 1)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    _link(o)
    o.location = loc
    o.scale = scale
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def hemi(name, r, loc, mat, seg=32, scale=(1, 1, 1)):
    """upper half sphere, closed at the base"""
    o = sphere(name, r, (0, 0, 0), mat, seg)
    bm = bmesh.new(); bm.from_mesh(o.data)
    geom = [v for v in bm.verts if v.co.z < -1e-5]
    bmesh.ops.delete(bm, geom=geom, context='VERTS')
    edges = [e for e in bm.edges if e.is_boundary]
    if edges:
        bmesh.ops.holes_fill(bm, edges=edges)
    bm.to_mesh(o.data); bm.free()
    o.location = loc
    o.scale = scale
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def rod(name, a, b, r, mat, verts=20, r2=None):
    """cylinder from point a to point b"""
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    o = cyl(name, r, -L / 2, L / 2, 0, 0, mat, verts, r2=r2)
    o.location = (a + b) / 2
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')
    return o


def figure(x, y, rot=0.0, shirt="#8FA597", trousers="#3B3A36", skin="#E2C4A0", hat="#F4F1EA", roll=True,
           pointing=False, s=1.0):
    """an architectural-model person (1.72 m) in a hard hat, a roll of drawings under the left arm.
    built facing −Y at the origin, then turned by rot degrees and moved to (x, y)"""
    m_sh = flat("fig_shirt", shirt, rough=0.85)
    m_tr = flat("fig_trousers", trousers, rough=0.8)
    m_sk = flat("fig_skin", skin, rough=0.6)
    m_hat = flat("fig_hat", hat, rough=0.35, coat=0.3)
    m_shoe = flat("fig_shoe", "#2A2826", rough=0.6)
    m_hair = flat("fig_hair", "#3A2D24", rough=0.7)
    P = []
    for sx in (-1, 1):
        P.append(rbox("shoe", 0.1, 0.25, 0.0, 0.07, m_shoe, r=0.045, edge=0.015, cx=sx * 0.085, cy=-0.035))
        P.append(rod("leg", (sx * 0.085, 0.0, 0.05), (sx * 0.09, 0.0, 0.9), 0.064, m_tr, r2=0.074))
    P.append(rbox("hips", 0.33, 0.2, 0.82, 0.97, m_tr, r=0.08, edge=0.03))
    P.append(cyl("torso", 0.155, 0.93, 1.40, 0, 0, m_sh, 32, r2=0.19, bevel=0.03))
    P[-1].scale = (1, 0.62, 1)
    P.append(sphere("shoulders", 0.19, (0, 0, 1.39), m_sh, 32, (1.12, 0.62, 0.42)))
    P.append(rod("neck", (0, 0, 1.42), (0, 0, 1.52), 0.048, m_sk))
    P.append(sphere("head", 0.1, (0, 0.0, 1.6), m_sk, 32, (0.92, 1.0, 1.08)))
    P.append(sphere("hair", 0.098, (0, 0.025, 1.615), m_hair, 32, (0.95, 1.0, 1.0)))
    P.append(hemi("hat", 0.118, (0, 0.0, 1.635), m_hat, 32, (1.0, 1.08, 0.9)))
    brim = cyl("brim", 0.135, 1.63, 1.642, 0, -0.012, m_hat, 40)
    brim.scale = (1, 1.12, 1)
    P.append(brim)
    # right arm: relaxed, or pointing forward-right
    if pointing:
        P.append(tube_curve("arm_r", [(0.22, 0, 1.38), (0.27, -0.12, 1.3), (0.31, -0.36, 1.33)], 0.044, m_sh))
        P.append(sphere("hand_r", 0.042, (0.32, -0.41, 1.335), m_sk, 20))
    else:
        P.append(tube_curve("arm_r", [(0.22, 0, 1.38), (0.25, 0.01, 1.12), (0.24, -0.03, 0.9)], 0.044, m_sh))
        P.append(sphere("hand_r", 0.042, (0.24, -0.035, 0.86), m_sk, 20))
    # left arm: bent, holding the roll against the body
    P.append(tube_curve("arm_l", [(-0.22, 0, 1.38), (-0.25, 0.02, 1.12), (-0.17, -0.17, 1.08)], 0.044, m_sh))
    P.append(sphere("hand_l", 0.042, (-0.15, -0.2, 1.08), m_sk, 20))
    if roll:
        m_paper = flat("roll_paper", "#F6F3EC", rough=0.8)
        m_band = flat("roll_band", "#B98B5E", rough=0.6)
        a, b = Vector((-0.27, 0.22, 1.2)), Vector((-0.1, -0.42, 1.02))
        P.append(rod("roll", a, b, 0.042, m_paper, 28))
        mid = a.lerp(b, 0.5)
        P.append(rod("roll_band", mid - (b - a).normalized() * 0.012, mid + (b - a).normalized() * 0.012, 0.0435, m_band, 28))
    e = place(P, (x, y, 0), rot, "figure")
    e.scale = (s, s, s)
    return e


def plinth(W, D, top_mat, slab_mat, slab=0.16):
    """the floor of a cut-away room: top surface material + a cream slab edge (like the carousel rooms)"""
    fl = box("floor", 0, W, 0, D, -slab, 0, None)
    fl.data.materials.append(top_mat)
    fl.data.materials.append(slab_mat)
    for p in fl.data.polygons:
        p.material_index = 0 if p.normal.z > 0.9 else 1
    box_uv(fl)
    return fl


def wall(name, x0, x1, y0, y1, z1, mat, cap_mat, slab=0.16):
    o = box(name, x0, x1, y0, y1, -slab, z1, None)
    o.data.materials.append(mat)
    o.data.materials.append(cap_mat)
    for p in o.data.polygons:
        c = p.center; n = p.normal
        # the cut faces (top, and the ends toward the viewer) take the cap colour, like the carousel rooms
        cut = (n.z > 0.9 and c.z > z1 - 0.01) or (n.y < -0.9 and c.y < y0 + 0.01 and y0 < 0.05) or (n.x > 0.9 and x1 > 2.0 and c.x > x1 - 0.01)
        p.material_index = 1 if cut else 0
    box_uv(o)
    return o


def label_pts(pts):
    return [Vector(p) for p in pts]


def finish(name):
    render(name)
