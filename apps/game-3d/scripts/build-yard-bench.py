"""制作院子木板长椅，尺寸匹配原有碰撞范围。"""
import json
import struct
from pathlib import Path

app = Path(__file__).resolve().parents[1]
# 每个面独立顶点，保证法线和木纹贴图方向正确。
faces = [
    ((0, 0, 1), [(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]),
    ((0, 0,-1), [(.5,-.5,-.5),(-.5,-.5,-.5),(-.5,.5,-.5),(.5,.5,-.5)]),
    ((1, 0, 0), [(.5,-.5,.5),(.5,-.5,-.5),(.5,.5,-.5),(.5,.5,.5)]),
    ((-1,0, 0), [(-.5,-.5,-.5),(-.5,-.5,.5),(-.5,.5,.5),(-.5,.5,-.5)]),
    ((0, 1, 0), [(-.5,.5,.5),(.5,.5,.5),(.5,.5,-.5),(-.5,.5,-.5)]),
    ((0,-1, 0), [(-.5,-.5,-.5),(.5,-.5,-.5),(.5,-.5,.5),(-.5,-.5,.5)])
]
positions, normals, uvs, indices = [], [], [], []
for normal, vertices in faces:
    start = len(positions) // 3
    for vertex, uv in zip(vertices, [(0,0),(1,0),(1,1),(0,1)]):
        positions.extend(vertex); normals.extend(normal); uvs.extend(uv)
    indices.extend([start,start+1,start+2,start,start+2,start+3])
binary = bytearray(); views = []
def append(data, target=None):
    while len(binary) % 4: binary.append(0)
    view = {'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data)}
    if target: view['target'] = target
    views.append(view); binary.extend(data); return len(views)-1
pos = append(struct.pack('<%sf' % len(positions), *positions), 34962)
nor = append(struct.pack('<%sf' % len(normals), *normals), 34962)
uv = append(struct.pack('<%sf' % len(uvs), *uvs), 34962)
idx = append(struct.pack('<%sH' % len(indices), *indices), 34963)
image = append((app / 'assets/office-textures/wood_table_worn_Diffuse.jpg').read_bytes())
accessors = [
    {'bufferView': pos, 'componentType':5126, 'count':24, 'type':'VEC3', 'min':[-.5]*3, 'max':[.5]*3},
    {'bufferView': nor, 'componentType':5126, 'count':24, 'type':'VEC3'},
    {'bufferView': uv, 'componentType':5126, 'count':24, 'type':'VEC2'},
    {'bufferView': idx, 'componentType':5123, 'count':36, 'type':'SCALAR'}
]
primitive = {'attributes': {'POSITION':0, 'NORMAL':1, 'TEXCOORD_0':2}, 'indices':3}
meshes = [{'primitives':[dict(primitive, material=i)]} for i in range(2)]
nodes = []
def piece(name, position, size, material=0):
    nodes.append({'name':name, 'mesh':material, 'translation':position, 'scale':size})
for z in [-.39,-.13,.13,.39]: piece('坐板', [0,.69,z], [3.2,.12,.23])
for y in [.96,1.2,1.44]: piece('靠背板', [0,y,-.5], [3.2,.2,.11])
for x in [-1.3,1.3]:
    for z in [-.37,.37]: piece('金属椅腿',[x,.31,z],[.12,.62,.12],1)
    piece('靠背支架',[x,1.08,-.47],[.12,1.04,.12],1)
    piece('座面横梁',[x,.58,0],[.14,.12,1.0],1)
piece('座面纵梁',[0,.52,0],[2.7,.1,.1],1)
while len(binary) % 4: binary.append(0)
doc = {'asset':{'version':'2.0','generator':'院子长椅生成器'}, 'scene':0,
       'scenes':[{'nodes':list(range(len(nodes)))}], 'nodes':nodes, 'meshes':meshes,
       'accessors':accessors, 'bufferViews':views, 'buffers':[{'byteLength':len(binary)}],
       'images':[{'bufferView':image,'mimeType':'image/jpeg'}], 'textures':[{'source':0}],
       'materials':[{'name':'旧木板','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'baseColorFactor':[.65,.56,.44,1], 'metallicFactor':0,'roughnessFactor':.9}},
                    {'name':'深色铁架','pbrMetallicRoughness':{'baseColorFactor':[.12,.12,.105,1], 'metallicFactor':.55,'roughnessFactor':.8}}]}
encoded = json.dumps(doc, ensure_ascii=False, separators=(',',':')).encode(); encoded += b' ' * (-len(encoded) % 4)
size = 12 + 8 + len(encoded) + 8 + len(binary)
output = app / 'public/assets/models/yard-bench.glb'
output.write_bytes(struct.pack('<4sII',b'glTF',2,size) + struct.pack('<II',len(encoded),0x4e4f534a) + encoded + struct.pack('<II',len(binary),0x004e4942) + binary)
print('院子长椅已生成：', output)
