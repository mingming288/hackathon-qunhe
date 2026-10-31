"""校准已有结局场景的地面高度与整体尺度。"""
from pathlib import Path
import bpy
import bmesh
base = Path('/Users/lijiawei/code/lux3d/output/branch-endings/2026-10-31-v1/assets')
out = Path(__file__).resolve().parents[1] / 'public/assets/models'
scenes = {
    'oak': (120, 130, 120, -.0045),
    'road': (63, 54, 45, -.0655),
    'beach': (125, 128, 75, -.02),
    'medicalExterior': (105, 85, 40, -.038),
}
for name, (sx, sy, sz, floor) in scenes.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(base / f'{name}-architecture-a1/glb.glb'))
    bpy.context.view_layer.update()
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        matrix = obj.matrix_world.copy()
        bm = bmesh.new(); bm.from_mesh(obj.data)
        for vertex in bm.verts:
            vertex.co = matrix @ vertex.co
        if name == 'beach':
            # 去掉混入海面的棚屋和杂物，海面由游戏单独绘制。
            seaward = [face for face in bm.faces if face.calc_center_median().y > .055]
            bmesh.ops.delete(bm, geom=seaward, context='FACES')
        direction = -1 if name == 'oak' else 1
        for vertex in bm.verts:
            point = vertex.co.copy()
            vertex.co = (point.x * sx * direction, point.y * sy * direction, (point.z - floor) * sz)
        bm.to_mesh(obj.data); bm.free(); obj.matrix_world.identity()
    bpy.ops.export_scene.gltf(filepath=str(out / f'{name.lower()}-shell.glb'), export_format='GLB')
