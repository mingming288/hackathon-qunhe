"""制作序章客厅与独立家具，沿用游戏内交互坐标。"""
from pathlib import Path
import math
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block, wall = helpers['block'], helpers['wall']
wood = bpy.data.materials.new('旧木材'); wood.use_nodes = True
nodes = wood.node_tree.nodes; links = wood.node_tree.links
shader = nodes.get('Principled BSDF')
for suffix, socket in [('Diffuse', 'Base Color'), ('Rough', 'Roughness'), ('nor_gl', 'Normal')]:
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = bpy.data.images.load(str(app / 'assets/office-textures' / f'wood_table_worn_{suffix}.jpg'), check_existing=True)
    if suffix != 'Diffuse': texture.image.colorspace_settings.name = 'Non-Color'
    texture.image.pack()
    if suffix == 'nor_gl':
        normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .45
        links.new(texture.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    else: links.new(texture.outputs['Color'], shader.inputs[socket])

def solid(name, color, metallic=0, roughness=.8, emission=0):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic; shader.inputs['Roughness'].default_value = roughness
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1); shader.inputs['Emission Strength'].default_value = emission
    return mat

paint = solid('褪色墙裙', (.19, .24, .19)); fabric = solid('磨旧布料', (.29, .27, .22))
dark = solid('电视外壳', (.055, .05, .04)); screen = solid('电视屏幕', (.27, .32, .30), .15, .3, .15)
metal = solid('旧黄铜', (.34, .24, .12), .6); shade = solid('暖色灯罩', (.64, .46, .27), 0, .8, .35)
rug = solid('褪色地毯', (.34, .24, .16)); trim = solid('地毯边纹', (.58, .45, .28))

def cylinder(name, location, radius, depth, mat, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(mat); return obj

def export(name):
    bpy.ops.export_scene.gltf(filepath=str(app / 'public/assets/models' / name), export_format='GLB')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

# 正面剖开，墙体与基础碰撞对齐。
block('木地板', (0,0,-.12), (14,12,.24), wood)
for x in [-6.85,6.85]:
    block('侧墙', (x,0,2), (.3,12,4), wall)
    block('侧墙裙', (x - math.copysign(.2,x),0,.65), (.1,11.8,1.3), paint)
    block('踢脚线', (x - math.copysign(.27,x),0,.12), (.15,11.8,.24), wood)
block('电视后墙', (0,5.85,2), (14,.3,4), wall)
block('后墙裙', (0,5.65,.65), (13.5,.1,1.3), paint)
block('后墙踢脚线', (0,5.58,.12), (13.5,.15,.24), wood)
block('地毯', (0,1,.015), (5.3,3.7,.03), rug)
for x in [-2.45,2.45]: block('地毯竖边', (x,1,.035), (.08,3.4,.02), trim)
for y in [-.6,2.6]: block('地毯横边', (0,y,.035), (4.9,.08,.02), trim)
# 窗框和墙上钟表增加生活痕迹。
block('窗暗面', (-4.3,5.62,2.75), (2.2,.08,1.6), dark)
for x in [-5.4,-4.3,-3.2]: block('窗竖框', (x,5.54,2.75), (.1,.12,1.7), wood)
for z in [1.95,2.75,3.55]: block('窗横框', (-4.3,5.54,z), (2.3,.12,.1), wood)
cylinder('墙钟木框', (2.7,5.52,3.05), .42, .12, wood, (math.pi/2,0,0))
cylinder('墙钟表盘', (2.7,5.43,3.05), .33, .04, trim, (math.pi/2,0,0))
export('living-room-rebuilt.glb')

# 每件家具单独导出，游戏仍保有各自的锚点与交互。
block('沙发底座', (0,0,.42), (3.25,1.3,.55), fabric)
block('沙发靠背', (0,-.52,1.02), (3.25,.3,1.15), fabric)
for x in [-1.48,1.48]: block('沙发扶手', (x,0,.75), (.28,1.3,.65), fabric)
for x in [-.95,0,.95]:
    block('座垫', (x,.08,.75), (.9,1.0,.18), fabric)
    block('靠垫', (x,-.34,1.2), (.9,.18,.68), fabric)
for x in [-1.28,1.28]:
    for y in [-.42,.42]: block('沙发木脚', (x,y,.1), (.18,.18,.2), wood)
export('living-sofa-rebuilt.glb')

block('电视柜主体', (0,0,.4), (2.8,.8,.8), wood)
for x in [-1.2,0,1.2]: block('柜门竖饰', (x,-.43,.4), (.08,.05,.7), trim)
block('电视机外壳', (0,0,1.45), (2.25,.65,1.35), dark)
block('电视屏幕', (-.12,-.34,1.5), (1.68,.04,.96), screen)
for z in [1.15,1.48,1.8]: cylinder('电视旋钮', (.92,-.37,z), .085, .07, metal, (math.pi/2,0,0))
export('living-tv-rebuilt.glb')

block('茶几桌面', (0,0,1.0), (2.4,1.4,.17), wood)
for x in [-1,1]:
    for y in [-.52,.52]: block('茶几木腿', (x,y,.47), (.17,.17,.94), wood)
block('茶几下层', (0,0,.22), (2.1,1.1,.1), wood)
export('living-coffee-table.glb')

cylinder('立灯底座', (0,0,.07), .42, .14, metal)
cylinder('立灯灯杆', (0,0,1.35), .06, 2.6, metal)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.6, radius2=.28, depth=.55, location=(0,0,2.75))
bpy.context.object.name = '暖色灯罩'; bpy.context.object.data.materials.append(shade)
export('living-floor-lamp.glb')
print('客厅及独立家具已导出')
