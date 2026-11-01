"""将不使用透明度的基础颜色贴图转为高质量图片，保留网格与其他贴图。"""
import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('用法：脚本 输入模型 输出模型')
source, target = map(Path, sys.argv[1:])
data = source.read_bytes()
magic, version, total = struct.unpack_from('<4sII', data)
if magic != b'glTF' or version != 2 or total != len(data): raise ValueError('模型格式错误')
offset = 12; chunks = {}
while offset < len(data):
    length, kind = struct.unpack_from('<II', data, offset); offset += 8
    chunks[kind] = data[offset:offset + length]; offset += length
doc = json.loads(chunks[0x4e4f534a]); binary = chunks[0x004e4942]
if len(doc.get('buffers', [])) != 1 or doc['buffers'][0].get('uri'):
    raise ValueError('只处理单个内嵌缓冲区的模型')

# 被透明材质或其他用途引用的贴图不能转换。
base, forbidden = set(), set()
def texture_indices(value):
    if isinstance(value, dict):
        if isinstance(value.get('index'), int): yield value['index']
        for v in value.values(): yield from texture_indices(v)
    elif isinstance(value, list):
        for v in value: yield from texture_indices(v)
for material in doc.get('materials', []):
    pbr = material.get('pbrMetallicRoughness', {})
    color = pbr.get('baseColorTexture')
    if color:
        (base if material.get('alphaMode', 'OPAQUE') == 'OPAQUE' else forbidden).add(color['index'])
    forbidden.update(texture_indices({k:v for k,v in pbr.items() if k != 'baseColorTexture'}))
    forbidden.update(texture_indices({k:v for k,v in material.items() if k != 'pbrMetallicRoughness'}))
textures = doc.get('textures', [])
candidates = {textures[i].get('source') for i in base - forbidden if i < len(textures)}
blocked_images = {textures[i].get('source') for i in forbidden if i < len(textures)}
candidates -= blocked_images
views = doc.get('bufferViews', [])
replacements = {}
with tempfile.TemporaryDirectory() as tmp:
    for index in sorted(i for i in candidates if isinstance(i, int)):
        image = doc['images'][index]
        if image.get('mimeType') != 'image/png' or 'bufferView' not in image: continue
        view_index = image['bufferView']
        if sum(1 for other in doc['images'] if other.get('bufferView') == view_index) != 1: continue
        view = views[view_index]
        if view.get('buffer') != 0: continue
        raw = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        png = Path(tmp) / f'{index}.png'; jpg = Path(tmp) / f'{index}.jpg'
        png.write_bytes(raw)
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '92', str(png), '--out', str(jpg)], check=True, capture_output=True)
        result = jpg.read_bytes()
        if len(result) >= len(raw): continue
        replacements[view_index] = result; image['mimeType'] = 'image/jpeg'
if not replacements: raise ValueError('没有可安全替换的基础颜色贴图')

# 所有缓冲区视图以四字节对齐，其他视图内容保持逐字节不变。
output = bytearray()
for index, view in enumerate(views):
    if view.get('buffer') != 0: raise ValueError('发现其他缓冲区')
    start, length = view.get('byteOffset', 0), view['byteLength']
    payload = replacements.get(index, binary[start:start + length])
    while len(output) % 4: output.append(0)
    view['byteOffset'], view['byteLength'] = len(output), len(payload)
    output.extend(payload)
while len(output) % 4: output.append(0)
doc['buffers'][0]['byteLength'] = len(output)
encoded = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode()
encoded += b' ' * ((-len(encoded)) % 4)
result = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(encoded) + 8 + len(output))
result += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
result += struct.pack('<II', len(output), 0x004e4942) + output
target.write_bytes(result)
print(f'{source.name}: {len(data)} → {len(result)} 字节，替换 {len(replacements)} 张颜色贴图')
