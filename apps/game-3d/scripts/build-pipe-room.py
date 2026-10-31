"""制作砸管处的石墙与可交互管道，坐标与现有场景一致。"""
from pathlib import Path
import math
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block, wall, floor = helpers['block'], helpers['wall'], helpers['floor']

def solid(name, color, metallic=0, roughness=.8):
    material = bpy.data.materials.new(name); material.diffuse_color = (*color, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return material

metal = solid('氧化铸铁', (.12, .16, .15), .7)
rust = solid('铁锈与法兰', (.26, .14, .075), .55)
dark = solid('排水槽', (.035, .045, .04), .4)

def cylinder(name, x, y, z, radius, depth, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=(x, y, z), rotation=(0, math.pi / 2, 0))
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(material)
    return obj

# 固定建筑留出正面入口，顶部剖开供第三人称镜头使用。
block('石板地面', (0, 0, -.15), (17.3, 19.3, .3), floor)
for x in [-8.4, 8.4]:
    block('两侧石墙', (x, 0, 1.9), (.45, 19, 3.8), wall)
block('后方石墙', (0, 9.35, 1.9), (17, .4, 3.8), wall)
for x in [-5.4, 5.4]:
    block('入口墙垛', (x, -9.35, 1.9), (6, .4, 3.8), wall)
block('入口门楣', (0, -9.35, 3.5), (5, .4, .6), wall)
# 背墙上的小管、管夹和排水沟不占据中间行走范围。
for z in [2.9, 3.35]:
    cylinder('墙面管线', 0, 9.08, z, .09, 15.5, rust)
    for x in [-6, -3, 0, 3, 6]:
        cylinder('管线固定环', x, 9.08, z, .135, .13, metal)
block('排水沟', (0, 2.1, .015), (8, .65, .03), dark)
for x in [i * .35 for i in range(-11, 12)]:
    block('排水沟格栅', (x, 2.1, .035), (.07, .65, .04), metal)
output = app / 'public/assets/models/pipe-room-rebuilt.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')

# 交互管道独立保存：仍由剧情目标控制，可替换而不丢失交互。
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
cylinder('主排水管', 0, 0, 1.6, 1.15, 4.8, metal)
for x in [-2.25, -1.5, 1.5, 2.25]:
    cylinder('生锈法兰', x, 0, 1.6, 1.26, .16, rust)
    for i in range(12):
        angle = i * math.tau / 12
        cylinder('法兰铆钉', x + .09, math.cos(angle) * 1.18, 1.6 + math.sin(angle) * 1.18, .055, .06, metal)
for x in [-1.8, 1.8]: block('管道支座', (x, 0, .25), (.4, 1.1, .5), wall)
output = app / 'public/assets/models/pipe-target-rebuilt.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')
print('砸管处与管道已导出')
