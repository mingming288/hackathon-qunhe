"""从已制作的禁闭室组装稿提取独立草席和石板，保留原始材质。"""
from pathlib import Path
import bpy

app = Path(__file__).resolve().parents[1]
source = Path('/Users/lijiawei/code/lux3d/output/branch-endings/solitary-pilot-v3/assembly/scene.glb')
assets = [('破旧草席', 'solitary-mat.glb', (1.6, 2.8, .1)),
          ('刻痕松动石板', 'solitary-inscribed-stone.glb', (1.2, 1, .25))]
for name, target, size in assets:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name == name]
    if len(objects) != 1: raise RuntimeError(f'找不到独立物件: {name}')
    obj = objects[0]
    for other in list(bpy.context.scene.objects):
        if other != obj: bpy.data.objects.remove(other, do_unlink=True)
    # 将组装稿的变换烘焙到网格，再以底面为原点适配游戏碰撞范围。
    for vertex in obj.data.vertices: vertex.co = obj.matrix_world @ vertex.co
    obj.parent = None; obj.matrix_world.identity()
    low = [min(vertex.co[i] for vertex in obj.data.vertices) for i in range(3)]
    high = [max(vertex.co[i] for vertex in obj.data.vertices) for i in range(3)]
    if any(high[i] - low[i] < 1e-6 for i in range(3)): raise RuntimeError(f'物件尺寸无效: {name}')
    for vertex in obj.data.vertices:
        vertex.co.x = (vertex.co.x - (low[0]+high[0])/2) * size[0] / (high[0]-low[0])
        vertex.co.y = (vertex.co.y - (low[1]+high[1])/2) * size[1] / (high[1]-low[1])
        vertex.co.z = (vertex.co.z - low[2]) * size[2] / (high[2]-low[2])
    bpy.ops.export_scene.gltf(filepath=str(app / 'public/assets/models' / target), export_format='GLB')
    print('已导出:', target)
