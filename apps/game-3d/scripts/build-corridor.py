"""重建游戏走廊主体：可复用的石墙和地面，保留既有门洞坐标。"""
from pathlib import Path
import bpy

APP = Path(__file__).resolve().parents[1]
TEXTURES = APP / 'assets/corridor-textures'
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, asset):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nodes = mat.node_tree.nodes; links = mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    for suffix, socket in [('Diffuse', 'Base Color'), ('Rough', 'Roughness'), ('nor_gl', 'Normal')]:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(TEXTURES / f'{asset}_{suffix}.jpg'), check_existing=True)
        if suffix != 'Diffuse': tex.image.colorspace_settings.name = 'Non-Color'
        tex.image.pack()
        if suffix == 'nor_gl':
            normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .65
            links.new(tex.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs[socket])
        else: links.new(tex.outputs['Color'], shader.inputs[socket])
    return mat

wall = material('旧石块墙面', 'stone_block_wall')
floor = material('磨损石板地面', 'monastery_stone_floor')

def block(name, center, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    uv = obj.data.uv_layers.active.data
    for poly in obj.data.polygons:
        normal = poly.normal
        for i in poly.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[i].vertex_index].co + obj.location
            if abs(normal.z) > .5: uv[i].uv = (vertex.x / 3.6, vertex.y / 3.6)
            elif abs(normal.x) > .5: uv[i].uv = (vertex.y / 4.2, vertex.z / 4.2)
            else: uv[i].uv = (vertex.x / 4.2, vertex.z / 4.2)
    return obj

if __name__ == '__main__':
    block('石板地面', (0, 0, -.12), (12.8, 28.8, .24), floor)
    for x in [-6.1, 6.1]:
        start = -14
        for center in [-11.2, -5.6, 0, 5.6, 11.2]:
            edge = center - 1.1
            block('墙垛', (x, (start + edge) / 2, 2), (.6, edge - start, 4), wall)
            block('门楣', (x, center, 3.535), (.6, 2.2, .93), wall)
            start = center + 1.1
        block('墙尾', (x, (start + 14) / 2, 2), (.6, 14 - start, 4), wall)
    block('尽头下墙', (0, 14.1, 1.55), (12.8, .6, 3.1), wall)
    block('尽头上墙', (0, 14.1, 3.86), (12.8, .6, .28), wall)
    for x in [-3.7, 3.7]: block('高窗侧墙', (x, 14.1, 3.48), (5.4, .6, .76), wall)
    output = APP / 'public/assets/models/corridor-rebuilt.glb'
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB')
    print('走廊模型已导出:', output)
