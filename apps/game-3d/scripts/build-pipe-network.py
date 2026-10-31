"""依照游戏迷宫障碍坐标制作地下管网；保留开放顶部与入口。"""
from pathlib import Path
import math
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block, wall, floor = helpers['block'], helpers['wall'], helpers['floor']

def solid(name, color, metallic=0, roughness=.8):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat

metal = solid('湿润铸铁', (.115, .145, .14), .65, .58)
rust = solid('锈蚀法兰', (.24, .12, .065), .5)
water = solid('积水', (.105, .16, .16), .3, .2)
# Blender 的正 Y 对应游戏的负 Z。
def wall_block(name, x, z, w, d, h=2.3):
    block(name, (x, -z, h / 2), (w, d, h), wall)

def pipe_x(x, z, length, height=1.8):
    z += .72
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.22, depth=length,
        location=(x, -z, height), rotation=(0, math.pi / 2, 0))
    bpy.context.object.name = '墙顶铸铁管'; bpy.context.object.data.materials.append(metal)
    for offset in [-length * .35, length * .35]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.28, depth=.13,
            location=(x + offset, -z, height), rotation=(0, math.pi / 2, 0))
        bpy.context.object.name = '管道法兰'; bpy.context.object.data.materials.append(rust)

def pipe_z(x, z, length, height=1.8):
    x += .72
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.22, depth=length,
        location=(x, -z, height), rotation=(math.pi / 2, 0, 0))
    bpy.context.object.name = '墙顶铸铁管'; bpy.context.object.data.materials.append(metal)
    for offset in [-length * .35, length * .35]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.28, depth=.13,
            location=(x, -z + offset, height), rotation=(math.pi / 2, 0, 0))
        bpy.context.object.name = '管道法兰'; bpy.context.object.data.materials.append(rust)

block('磨损石板地面', (0, 0, -.14), (28.4, 31.4, .28), floor)
for x in [-14, 14]: wall_block('外围侧墙', x, 0, .6, 31, 3.2)
wall_block('出口外墙左侧', -3.75, -15.5, 20.5, .6, 3.2)
wall_block('出口外墙右侧', 12.75, -15.5, 2.5, .6, 3.2)
block('出口门楣', (9, 15.5, 3.05), (5, .6, .3), wall)
# 以下五段与世界碰撞体共用坐标；不要移动实体而不同时调整碰撞。
segments = [(-5, 4, 1, 15), (5, -4, 1, 15), (-9, -6, 7, 1), (9, 7, 7, 1), (0, -11, 9, 1)]
for index, (x, z, w, d) in enumerate(segments):
    wall_block(f'迷宫隔墙{index + 1}', x, z, w, d)
    if w > d: pipe_x(x, z, w - .5)
    else: pipe_z(x, z, d - .5)
# 浅水仅为视觉层，避开起点和出口的落脚区域。
for x, z, w, d in [(-9, 3, 3, 8), (0, -3, 3, 8), (10, 1, 3, 7)]:
    points = []
    for i in range(20):
        angle = i * math.tau / 20
        edge = .82 + .12 * math.sin(i * 4.1) + .06 * math.cos(i * 2.7)
        points.append((x + w * .5 * edge * math.cos(angle), -z + d * .5 * edge * math.sin(angle), .015))
    mesh = bpy.data.meshes.new('积水轮廓'); mesh.from_pydata(points, [], [list(range(len(points)))]); mesh.update()
    obj = bpy.data.objects.new('浅积水', mesh); bpy.context.collection.objects.link(obj); obj.data.materials.append(water)
output = app / 'public/assets/models/pipe-network-rebuilt.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')
print('地下管网已导出:', output)
