"""把已生成的开放式建筑校准到游戏平面，源文件保持不变。"""
from pathlib import Path
import bpy
base = Path('/Users/lijiawei/code/lux3d/output/branch-endings/2026-10-31-v1/assets')
out = Path(__file__).resolve().parents[1] / 'public/assets/models'
# 横向、纵向、垂直比例与源地面高度；开放面保留用于镜头和场景转场。
rooms = {
    'operatingRoom': (6, 7, 2, -.86),
    'evidence': (66, 57, 33, -.0554),
    'supermarket': (45, 45, 21, -.0936),
    'bank': (70, 55, 30, -.0632),
}
for name, (sx, sy, sz, floor) in rooms.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(base / f'{name}-architecture-a1/glb.glb'))
    bpy.context.view_layer.update()
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        for vertex in obj.data.vertices:
            point = obj.matrix_world @ vertex.co
            vertex.co = (point.x * sx, point.y * sy, (point.z - floor) * sz)
        obj.matrix_world.identity()
    bpy.ops.export_scene.gltf(filepath=str(out / f'{name.lower()}-shell.glb'), export_format='GLB')
