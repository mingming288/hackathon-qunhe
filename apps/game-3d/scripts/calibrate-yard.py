"""保留院子生成模型的地面与围墙，移除与独立建筑冲突的主体。"""
from pathlib import Path
import bpy
import bmesh
source = Path('/Users/lijiawei/code/lux3d/output/common-scenes-high-quality-2026-10-31/local-refinements/yard/scene.glb')
target = Path(__file__).resolve().parents[1] / 'public/assets/models/yard-shell.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
bpy.context.view_layer.update()
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    matrix = obj.matrix_world.copy()
    bm = bmesh.new(); bm.from_mesh(obj.data)
    for v in bm.verts:
        v.co = matrix @ v.co
    # 建筑位于地面两侧；围墙、道路和补齐的地面不参与删除。
    removed = [f for f in bm.faces if .235 < abs(f.calc_center_median().x) < .45
               and abs(f.calc_center_median().y) < .31 and f.calc_center_median().z > -.115]
    bmesh.ops.delete(bm, geom=removed, context='FACES')
    for v in bm.verts:
        v.co = (v.co.x * 39, v.co.y * 37, (v.co.z + .1217) * 34)
    bm.to_mesh(obj.data); bm.free()
    obj.parent = None; obj.matrix_world.identity()
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB')
