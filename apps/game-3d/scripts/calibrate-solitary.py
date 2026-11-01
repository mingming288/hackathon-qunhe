"""将禁闭室组装稿按游戏空间校准，草席和石板仍由游戏独立管理。"""
from pathlib import Path
import bpy
source = Path('/Users/lijiawei/code/lux3d/output/branch-endings/solitary-pilot-v3/assembly/scene.glb')
target = Path(__file__).resolve().parents[1] / 'public/assets/models/solitary-shell.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
bpy.context.view_layer.update()
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    if obj.name in ('破旧草席', '刻痕松动石板'):
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    for vertex in obj.data.vertices:
        point = obj.matrix_world @ vertex.co
        vertex.co = (point.x * 1.2, point.y * 1.3, point.z * 1.2)
    obj.parent = None
    obj.matrix_world.identity()
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB')
