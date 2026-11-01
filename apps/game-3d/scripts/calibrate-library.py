"""按图书馆可行走区域校准原有建筑主体。"""
from pathlib import Path
import bpy
source = Path('/Users/lijiawei/code/lux3d/output/fourth-level-lux3d/模型/图书馆整体/source_glb.glb')
target = Path(__file__).resolve().parents[1] / 'public/assets/models/library-shell.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    for vertex in obj.data.vertices:
        point = obj.matrix_world @ vertex.co
        vertex.co = ((point.x - .0327) * 43, point.y * 28.4, (point.z + .1496) * 13)
    obj.matrix_world.identity()
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB')
