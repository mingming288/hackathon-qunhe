"""按游戏坐标重建典狱长办公室，家具和剧情触发点保持独立。"""
from pathlib import Path
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block, stone = helpers['block'], helpers['wall']

wood = bpy.data.materials.new('磨损深色木材'); wood.use_nodes = True
nodes = wood.node_tree.nodes; links = wood.node_tree.links
shader = nodes.get('Principled BSDF')
for suffix, socket in [('Diffuse','Base Color'), ('Rough','Roughness'), ('nor_gl','Normal')]:
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(app / 'assets/office-textures' / f'wood_table_worn_{suffix}.jpg'), check_existing=True)
    if suffix != 'Diffuse': tex.image.colorspace_settings.name = 'Non-Color'
    tex.image.pack()
    if suffix == 'nor_gl':
        normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .4
        links.new(tex.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    else: links.new(tex.outputs['Color'], shader.inputs[socket])

# 开放的前侧对应院子入口，周边补景仅在游戏视角显示。
block('木地板', (0, 0, -.12), (19.6, 18.6, .24), wood)
for x in [-9.8, 9.8]: block('办公室侧墙', (x, 0, 2), (.4, 19, 4), stone)
block('后墙下方', (0, 9.5, 1.3), (20, .4, 2.6), stone)
block('后墙上方', (0, 9.5, 3.8), (20, .4, .4), stone)
block('窗左墙', (-5.75, 9.5, 3.2), (8.5, .4, 1.2), stone)
block('窗右墙', (5.75, 9.5, 3.2), (8.5, .4, 1.2), stone)
# 木质墙裙与檐线让办公室与监舍有所区别。
for x in [-9.55, 9.55]:
    block('侧墙木墙裙', (x, 0, .52), (.1, 18.8, 1.04), wood)
    block('侧墙檐线', (x, 0, 3.84), (.12, 18.8, .12), wood)
block('后墙木墙裙', (0, 9.25, .52), (19.4, .1, 1.04), wood)
for x in [-.65, 0, .65]: block('窗竖框', (x, 9.25, 3.2), (.08, .12, 1.2), wood)
block('窗横框', (0, 9.25, 3.2), (3, .12, .08), wood)
block('窗台', (0, 9.2, 2.6), (3.25, .35, .12), wood)
output = app / 'public/assets/models/office-rebuilt.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')
print('办公室已导出:', output)
