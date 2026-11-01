"""移除无引用的人物模型数据，保留贴图、网格、骨骼和动画原始字节。"""
import json
import struct
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('用法：脚本 输入模型 输出模型')
source, target = map(Path, sys.argv[1:])
data = source.read_bytes()
magic, version, total = struct.unpack_from('<4sII', data)
if magic != b'glTF' or version != 2 or total != len(data):
    raise ValueError('模型格式错误')
offset, chunks = 12, {}
while offset < len(data):
    length, kind = struct.unpack_from('<II', data, offset)
    offset += 8
    if kind in chunks or offset + length > len(data): raise ValueError('模型数据块错误')
    chunks[kind] = data[offset:offset + length]
    offset += length
if set(chunks) != {0x4e4f534a, 0x004e4942}: raise ValueError('包含不支持的数据块')
doc, binary = json.loads(chunks[0x4e4f534a]), chunks[0x004e4942]
if doc.get('extensionsUsed') or doc.get('extensionsRequired') or len(doc.get('buffers', [])) != 1 or doc['buffers'][0].get('uri'):
    raise ValueError('不支持扩展或外部缓冲区')
if any('sparse' in accessor for accessor in doc.get('accessors', [])):
    raise ValueError('不支持稀疏访问器')

# 记录并重映射全部标准网格、蒙皮和动画访问器。
references = []
def ref(container, key):
    if key in container: references.append((container, key))
for mesh in doc.get('meshes', []):
    for primitive in mesh['primitives']:
        ref(primitive, 'indices')
        for name in primitive['attributes']: ref(primitive['attributes'], name)
        for morph in primitive.get('targets', []):
            for name in morph: ref(morph, name)
for skin in doc.get('skins', []): ref(skin, 'inverseBindMatrices')
for animation in doc.get('animations', []):
    for sampler in animation['samplers']:
        ref(sampler, 'input'); ref(sampler, 'output')
accessors = doc.get('accessors', [])
used = sorted({container[key] for container, key in references})
if any(not isinstance(index, int) or index < 0 or index >= len(accessors) for index in used):
    raise ValueError('访问器引用错误')
mapping = {old: new for new, old in enumerate(used)}
for container, key in references: container[key] = mapping[container[key]]
doc['accessors'] = [accessors[index] for index in used]

view_references = [(a, 'bufferView') for a in doc['accessors'] if 'bufferView' in a]
view_references += [(image, 'bufferView') for image in doc.get('images', []) if 'bufferView' in image]
views = doc.get('bufferViews', [])
used_views = sorted({container[key] for container, key in view_references})
if any(not isinstance(index, int) or index < 0 or index >= len(views) for index in used_views):
    raise ValueError('缓冲视图引用错误')
view_mapping = {old: new for new, old in enumerate(used_views)}
for container, key in view_references: container[key] = view_mapping[container[key]]
output = bytearray()
for index in used_views:
    view = views[index]
    start, length = view.get('byteOffset', 0), view['byteLength']
    if view.get('buffer') != 0 or start < 0 or start + length > len(binary): raise ValueError('缓冲视图越界')
    while len(output) % 4: output.append(0)
    view['byteOffset'] = len(output)
    output.extend(binary[start:start + length])
while len(output) % 4: output.append(0)
doc['bufferViews'] = [views[index] for index in used_views]
doc['buffers'][0]['byteLength'] = len(output)
encoded = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
result = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(encoded) + 8 + len(output))
result += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
result += struct.pack('<II', len(output), 0x004e4942) + output
target.write_bytes(result)
print(f'{source.name}: {len(data)} → {len(result)} 字节')
