"""制作办公室专用保险柜、刺绣及账本，保持独立剧情锚点。"""
from pathlib import Path
import math
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block = helpers['block']
wood = bpy.data.materials.new('磨损木框'); wood.use_nodes = True
nodes = wood.node_tree.nodes; links = wood.node_tree.links; shader = nodes.get('Principled BSDF')
for suffix, socket in [('Diffuse','Base Color'), ('Rough','Roughness'), ('nor_gl','Normal')]:
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(app / 'assets/office-textures' / f'wood_table_worn_{suffix}.jpg'), check_existing=True)
    if suffix != 'Diffuse': tex.image.colorspace_settings.name = 'Non-Color'
    tex.image.pack()
    if suffix == 'nor_gl':
        normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .45
        links.new(tex.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    else: links.new(tex.outputs['Color'], shader.inputs[socket])

def material(name, color, metallic=0, rough=.8):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF'); shader.inputs['Base Color'].default_value = (*color,1)
    shader.inputs['Metallic'].default_value = metallic; shader.inputs['Roughness'].default_value = rough
    return mat

iron = material('旧铁', (.11,.13,.12), .75); rust = material('锈蚀铁边', (.24,.14,.08), .55)
brass = material('磨旧黄铜', (.44,.32,.16), .7); fabric = material('旧织物', (.45,.39,.28))
thread = material('刺绣线', (.16,.22,.18)); leather = material('账本封皮', (.24,.12,.075)); paper = material('旧纸', (.68,.60,.44))

def cylinder(name, center, radius, depth, mat, rotation=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=center, rotation=rotation)
    bpy.context.object.name = name; bpy.context.object.data.materials.append(mat)

def export(name):
    bpy.ops.export_scene.gltf(filepath=str(app / 'public/assets/models' / name), export_format='GLB')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

# 正面朝游戏内正 Z 方向。
block('保险柜主体', (0,0,.95), (1.8,1.25,1.9), iron)
block('保险柜门', (0,-.67,1.0), (1.6,.13,1.65), rust)
block('门内面板', (0,-.75,1.0), (1.4,.05,1.43), iron)
for x in [-.69,.69]:
    for z in [.36,1.64]: cylinder('门角铆钉', (x,-.79,z), .055, .06, brass)
for z in [.45,1.05,1.6]: cylinder('门铰链', (-.83,-.68,z), .095, .32, rust, (0,0,0))
cylinder('密码盘底', (.05,-.82,1.05), .24, .09, brass)
cylinder('密码盘', (.05,-.89,1.05), .16, .08, iron)
cylinder('密码盘中心', (.05,-.95,1.05), .075, .06, brass)
cylinder('把手底座', (.52,-.82,.9), .08, .08, brass)
block('把手', (.52,-.87,.73), (.08,.08,.34), brass)
# 保险柜埋入后墙并抬高到刺绣后方；交互锚点仍使用地面坐标。
for obj in bpy.context.scene.objects: obj.location.z += .7
export('office-safe.glb')

# 刺绣置于墙面上的高度，与原互动目标一致。
block('刺绣布面', (0,0,1.75), (1.62,.06,2.22), fabric)
for x in [-.88,.88]: block('木框竖边', (x,-.06,1.75), (.16,.18,2.55), wood)
for z in [.52,2.98]: block('木框横边', (0,-.06,z), (1.9,.18,.16), wood)
# 用细条构成简洁的山形和水线，贴近原设定的编织图案。
for x, z, angle, length in [(-.5,1.5,-.65,.75),(-.19,1.67,.55,.85),(.17,1.5,-.65,.85),(.48,1.57,.55,.7)]:
    ob=block('山形刺绣', (x,-.043,z), (.055,.02,length), thread); ob.rotation_euler[1]=angle
for z, x, length in [(1.14,-.05,1.18),(1.02,.1,.8),(.9,-.18,.65)]: block('水线刺绣', (x,-.043,z), (length,.02,.035), thread)
cylinder('刺绣落日', (.43,-.05,2.34), .16, .025, rust)
export('office-embroidery.glb')

block('账本纸页', (0,0,.095), (.68,.9,.15), paper)
for z in [.015,.18]: block('账本封皮', (0,0,z), (.75,.96,.035), leather)
block('账本书脊', (-.355,0,.095), (.06,.96,.18), leather)
for y in [-.32,.32]: block('账本压线', (0,y,.2), (.62,.012,.008), brass)
export('office-ledger.glb')
print('办公室道具已导出')
