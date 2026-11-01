"""制作雨夜外墙和独立排水口，预留三条剧情出口的行走空间。"""
from pathlib import Path
import math
import random
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

metal = solid('旧铁栏', (.11, .13, .12), .6)
stone = solid('潮湿岩石', (.18, .20, .19), .1)
dark = solid('排水洞深处', (.015, .022, .023), 0, 1)
# 游戏世界的负 Z 对应 Blender 的正 Y。
block('潮湿石地', (0, 0, -.16), (34.5, 32.5, .32), floor)
for x in [-10, 10]: block('外墙', (x, 15.8, 3.1), (14, .7, 6.2), wall)
block('排水口上方石墙', (0, 15.8, 5.65), (6, .7, 1.1), wall)
for x in [-16.4, -6.5, 6.5, 16.4]:
    block('围墙立柱', (x, 15.75, 3.4), (1, 1, 6.8), wall)
    block('柱顶石', (x, 15.75, 6.85), (1.3, 1.2, .25), wall)
for z in [6.7, 7.15]: block('墙顶铁栏横杆', (0, 15.75, z), (32, .12, .12), metal)
for x in range(-15, 16, 2): block('墙顶铁栏立杆', (x, 15.75, 6.9), (.1, .1, .85), metal)
rng = random.Random(172)
for side in [-1, 1]:
    for i in range(18):
        x = side * rng.uniform(11.8, 16.3); y = rng.uniform(-11, 12)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(x, y, .17))
        obj = bpy.context.object; obj.name = '墙外碎石'; obj.scale = (rng.uniform(.25,.65), rng.uniform(.3,.8), rng.uniform(.18,.35)); obj.data.materials.append(stone)
output = app / 'public/assets/models/rain-exterior-rebuilt.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')

# 独立模型绑定原有剧情目标，法线朝向玩家的前方。
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
block('洞口石墙背衬', (0, 1.04, 2.5), (5.3, .15, 5), wall)
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=2.18, depth=.12, location=(0, .8, 2.2), rotation=(math.pi / 2, 0, 0))
bpy.context.object.name = '排水洞暗面'; bpy.context.object.data.materials.append(dark)
bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=12, location=(0, .64, 2.2), rotation=(math.pi / 2, 0, 0), major_radius=2.32, minor_radius=.3)
bpy.context.object.name = '石砌排水洞边缘'; bpy.context.object.data.materials.append(wall)
for x in [-2.8, 2.8]: block('排水口侧柱', (x, .8, 2.5), (.65, .8, 5), wall)
block('排水口门楣', (0, .8, 5), (6.3, .8, .5), wall)
output = app / 'public/assets/models/rain-drain-rebuilt.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')
print('雨夜场景和排水口已导出')
