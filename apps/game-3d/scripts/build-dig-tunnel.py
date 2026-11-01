"""按主线的坐标和通路，重建可复现的墙后挖掘通道。"""
from pathlib import Path
import random
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block = helpers['block']

def material(name, folder, asset):
    result = bpy.data.materials.new(name); result.use_nodes = True
    nodes = result.node_tree.nodes; links = result.node_tree.links
    shader = nodes.get('Principled BSDF')
    for suffix, socket in [('Diffuse', 'Base Color'), ('Rough', 'Roughness'), ('nor_gl', 'Normal')]:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(app / folder / f'{asset}_{suffix}.jpg'), check_existing=True)
        if suffix != 'Diffuse': tex.image.colorspace_settings.name = 'Non-Color'
        tex.image.pack()
        if suffix == 'nor_gl':
            normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .55
            links.new(tex.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs['Normal'])
        else: links.new(tex.outputs['Color'], shader.inputs[socket])
    return result

earth = material('粗糙岩土', 'assets/tunnel-textures', 'rocky_trail')
wood = material('旧木支撑', 'assets/office-textures', 'wood_table_worn')
block('岩土地面', (0, 0, -.14), (14.6, 24.5, .28), earth)
for side in [-1, 1]:
    block('通道土壁', (side*7, 0, 1.6), (.6, 24, 3.2), earth)
    # 只在墙边制作不规则突起，保持中间通路和第三人称镜头清晰。
    rng = random.Random(1040 + side)
    for index in range(28):
        y = -11.2 + index*.82 + rng.uniform(-.12,.12)
        z = rng.uniform(.25, 2.9)
        obj = block('岩壁突起', (side*6.92, y, z), (.42, rng.uniform(.35,.9), rng.uniform(.35,.75)), earth)
        obj.rotation_euler.y = rng.uniform(-.2,.2)
    for y in [-9, -5, -1, 3, 7, 11]:
        block('支撑立柱', (side*6.52, y, 1.6), (.22, .25, 3.2), wood)
        block('侧面支撑梁', (side*5.85, y, 3.15), (1.5, .24, .2), wood)
        block('墙脚横梁', (side*6.55, y, .18), (.32, 1.6, .25), wood)
# 出口两侧预留门洞；顶盖保持剖视以免遮挡镜头。
for x in [-4.5, 4.5]: block('出口两侧岩壁', (x, 11.9, 1.6), (5, .5, 3.2), earth)
block('出口上方岩壁', (0, 11.9, 3.02), (4, .5, .36), earth)
output = app / 'public/assets/models/dig-rebuilt.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')
print('挖掘通道已导出:', output)
