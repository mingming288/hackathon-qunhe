"""校准已有牢房主体的地面、朝向和墙内尺度。"""
from pathlib import Path
import bpy

source = Path('/Users/lijiawei/code/lux3d/output/common-scenes-high-quality-2026-10-31/source-models/cell/source_glb.glb')
target = Path(__file__).resolve().parents[1] / 'public/assets/models/cell-shell.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    for vertex in obj.data.vertices:
        point = obj.matrix_world @ vertex.co
        vertex.co = (-(point.x + .049) * 16.6, -point.y * 15.4, (point.z + .241) * 8)
    obj.matrix_world.identity()
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB')
