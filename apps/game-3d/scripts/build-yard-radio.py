"""制作院子中的独立旧收音机，沿用原有维修交互位置。"""
from pathlib import Path
import math
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block = helpers['block']
wood = bpy.data.materials.new('旧木外壳'); wood.use_nodes = True
nodes = wood.node_tree.nodes; links = wood.node_tree.links; shader = nodes.get('Principled BSDF')
for suffix, socket in [('Diffuse', 'Base Color'), ('Rough', 'Roughness'), ('nor_gl', 'Normal')]:
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(app / 'assets/office-textures' / f'wood_table_worn_{suffix}.jpg'), check_existing=True)
    if suffix != 'Diffuse': tex.image.colorspace_settings.name = 'Non-Color'
    tex.image.pack()
    if suffix == 'nor_gl':
        normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .45
        links.new(tex.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    else: links.new(tex.outputs['Color'], shader.inputs[socket])

def solid(name, color, metallic=0, roughness=.7):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF'); shader.inputs['Base Color'].default_value = (*color,1)
    shader.inputs['Metallic'].default_value = metallic; shader.inputs['Roughness'].default_value = roughness
    return mat

metal = solid('旧金属', (.19,.16,.12), .65); black = solid('喇叭网罩', (.045,.05,.045))
cream = solid('刻度', (.65,.53,.34)); glass = solid('频率窗', (.13,.18,.17), .15, .3)
# 正面朝向游戏的正 Z。
block('收音机木箱', (0,0,.36), (1.2,.48,.72), wood)
block('扬声器底板', (-.3,-.25,.37), (.48,.03,.52), black)
for z in [.15,.21,.27,.33,.39,.45,.51,.57]: block('喇叭栅条', (-.3,-.275,z), (.46,.025,.018), metal)
block('频率框', (.3,-.265,.5), (.48,.045,.19), metal)
block('频率窗', (.3,-.295,.5), (.43,.018,.15), glass)
for x in [.14,.21,.28,.35,.42]: block('频率刻度', (x,-.31,.5), (.008,.008,.09), cream)
for x,r in [(.18,.085),(.43,.065)]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=.07,location=(x,-.31,.22),rotation=(math.pi/2,0,0))
    bpy.context.object.name='调频旋钮'; bpy.context.object.data.materials.append(metal)
for x in [-.46,.46]: block('手柄支架',(x,0,.8),(.06,.09,.16),metal)
block('提手',(0,0,.88),(.98,.08,.06),metal)
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.018,depth=.65,location=(.4,.12,1.02),rotation=(0,.5,0))
bpy.context.object.name='收音机天线'; bpy.context.object.data.materials.append(metal)
bpy.ops.export_scene.gltf(filepath=str(app / 'public/assets/models/yard-radio.glb'), export_format='GLB')
print('院子收音机已导出')
