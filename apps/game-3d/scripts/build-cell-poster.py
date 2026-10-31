"""用原版海报图制作牢房内的贴墙模型，复用长椅模型中的方盒几何。"""
import json
import struct
import subprocess
import tempfile
from pathlib import Path

app = Path(__file__).resolve().parents[1]
source = (app / 'public/assets/models/yard-bench.glb').read_bytes()
json_size = struct.unpack_from('<I', source, 12)[0]
doc = json.loads(source[20:20 + json_size])
binary_start = 20 + json_size + 8
geometry_end = doc['bufferViews'][4]['byteOffset']
binary = bytearray(source[binary_start:binary_start + geometry_end])
# 原长椅的纹理坐标与海报图片上下方向相反。
uv_offset = doc['bufferViews'][2]['byteOffset']
for index in range(24):
    offset = uv_offset + index * 8 + 4
    struct.pack_into('<f', binary, offset, 1 - struct.unpack_from('<f', binary, offset)[0])
with tempfile.TemporaryDirectory() as directory:
    png = Path(directory) / 'poster.png'
    original = app.parent.parent / 'Beyond the wall/assets/main/images/poster_female.webp'
    subprocess.run(['sips', '-s', 'format', 'png', str(original), '--out', str(png)], check=True, stdout=subprocess.DEVNULL)
    image = png.read_bytes()
while len(binary) % 4: binary.append(0)
doc['bufferViews'] = doc['bufferViews'][:4] + [{'buffer':0, 'byteOffset':len(binary), 'byteLength':len(image)}]
binary.extend(image)
while len(binary) % 4: binary.append(0)
doc['buffers'][0]['byteLength'] = len(binary)
doc['images'] = [{'bufferView':4,'mimeType':'image/png'}]
doc['materials'] = [{'name':'原版海报', 'alphaMode':'BLEND', 'doubleSided':True,
    'pbrMetallicRoughness':{'baseColorTexture':{'index':0}, 'metallicFactor':0, 'roughnessFactor':1}}]
doc['meshes'] = doc['meshes'][:1]
doc['nodes'] = [{'name':'贴墙海报','mesh':0,'translation':[0,1.75,0],'scale':[1.8,2.7,.02]}]
doc['scenes'] = [{'nodes':[0]}]
encoded = json.dumps(doc, ensure_ascii=False, separators=(',',':')).encode(); encoded += b' ' * (-len(encoded) % 4)
size = 12 + 8 + len(encoded) + 8 + len(binary)
output = app / 'public/assets/models/cell-poster.glb'
output.write_bytes(struct.pack('<4sII',b'glTF',2,size) + struct.pack('<II',len(encoded),0x4e4f534a) + encoded + struct.pack('<II',len(binary),0x004e4942) + binary)
