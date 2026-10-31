"""按现有碰撞坐标重建牢房、图书馆和院子主体；复用走廊材质。"""
from pathlib import Path
import runpy
import bpy

app = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(app / 'scripts/build-corridor.py'))
block, wall, floor = (helpers[key] for key in ('block', 'wall', 'floor'))
metal = bpy.data.materials.new('旧铁'); metal.diffuse_color = (.12, .11, .10, 1)
metal.use_nodes = True
metal.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .65
metal.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .7

def clear_geometry():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def save(name):
    bpy.ops.export_scene.gltf(filepath=str(app / 'public/assets/models' / (name + '-rebuilt.glb')), export_format='GLB')

def wall_with_window(x, y, width, height, sill, window_width, window_height):
    block('窗下墙', (x, y, sill/2), (width,.5,sill), wall)
    top = height - sill - window_height
    block('窗上墙', (x,y,height-top/2), (width,.5,top), wall)
    side = (width-window_width)/2
    for sign in [-1, 1]:
        block('窗侧墙',(x+sign*(window_width+side)/2,y,sill+window_height/2),(side,.5,window_height),wall)

# 建筑尺寸以游戏单位表示，与现有角色、碰撞、出入口共用同一坐标。
clear_geometry()
block('牢房地面',(0,0,-.12),(12.8,12.8,.24),floor)
for x in [-6.1,6.1]: block('牢房侧墙',(x,0,2),(.5,12.4,4),wall)
wall_with_window(0,6.2,12.4,4,2.8,1.8,.7)
for x in [-.6,-.3,0,.3,.6]: block('高窗铁栅',(x,5.9,3.15),(.065,.12,.7),metal)
block('高窗横栅',(0,5.9,3.15),(1.8,.12,.06),metal)
# 镜头侧保留通往走廊的门洞和敞口，不遮挡第三人称镜头。
block('入口左墙',(-5.5,-6.2,1.1),(1.2,.5,2.2),wall)
block('入口墙段',(2,-6.2,1.1),(8,.5,2.2),wall)
save('cell')

clear_geometry()
block('图书馆地面',(0,0,-.12),(22,20.5,.24),floor)
for x in [-10.75,10.75]: block('图书馆侧墙',(x,0,2),(.5,20,4),wall)
wall_with_window(0,10,21.6,4,2.7,3,.85)
# 开放的前侧让玩家和镜头从院子进入。
save('library')

clear_geometry()
block('院子石地',(0,0,-.12),(40,38,.24),floor)
block('院子后墙',(0,19,3),(40,.6,6),wall)
for x in [-20,20]: block('院子侧墙',(x,0,3),(.6,38,6),wall)
for x in [-17.5,17.5]:
    block('塔基',(x,16.5,3.75),(2.7,2.7,7.5),wall)
    block('瞭望室',(x,16.5,8),(4,4,2),wall)
    block('塔顶',(x,16.5,9.1),(4.4,4.4,.3),wall)
# 道路和建筑位置沿用现有院子布局。
block('中央道路',(0,1,.014),(3.2,30,.028),floor)
block('横向道路',(0,5,.016),(21,3.2,.03),floor)
save('yard')
