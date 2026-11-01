"""将既有双侧门洞走廊按游戏尺度导出，保留原始模型。"""
import bpy
from pathlib import Path

source = Path('/Users/lijiawei/code/lux3d/output/second-level-lux3d/本地加工/监区走廊_双侧门洞结构版.blend')
target = Path(__file__).resolve().parents[1] / 'public/assets/models/cell-corridor.glb'
bpy.ops.wm.open_mainfile(filepath=str(source))
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        obj.location.x *= 2
        obj.location.y *= 2
        obj.location.z *= 4 / 3
        obj.scale.x *= 2
        obj.scale.y *= 2
        obj.scale.z *= 4 / 3
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB')
