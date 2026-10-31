"""从人物文件提取动作和骨架节点，保留原始动作数据，不重复携带网格贴图。"""
import json
import struct
import sys
from pathlib import Path

if len(sys.argv) != 3: raise SystemExit('用法：脚本 输入模型 输出动作文件')
source, target = map(Path, sys.argv[1:]); data = source.read_bytes()
magic, version, total = struct.unpack_from('<4sII', data)
if magic != b'glTF' or version != 2 or total != len(data): raise ValueError('模型格式错误')
offset = 12; chunks = {}
while offset < len(data):
    length, kind = struct.unpack_from('<II', data, offset); offset += 8
    if offset + length > len(data) or kind in chunks: raise ValueError('模型块不完整')
    chunks[kind] = data[offset:offset + length]; offset += length
doc = json.loads(chunks[0x4e4f534a]); binary = chunks[0x004e4942]
if len(doc.get('buffers', [])) != 1 or doc['buffers'][0].get('uri') or not doc.get('animations'):
    raise ValueError('仅支持内嵌缓冲区且包含动作的模型')
if doc.get('extensionsUsed') or doc.get('extensionsRequired'):
    raise ValueError('不支持包含扩展的动作模型')
if any('camera' in node for node in doc.get('nodes', [])) or any(
    channel['target']['path'] == 'weights' for animation in doc['animations'] for channel in animation['channels']
):
    raise ValueError('不支持相机或变形权重动作')
accessor_ids = sorted({sampler[key] for animation in doc['animations'] for sampler in animation['samplers'] for key in ['input','output']})
accessors = [doc['accessors'][index].copy() for index in accessor_ids]
if any('sparse' in accessor or 'bufferView' not in accessor for accessor in accessors): raise ValueError('不支持稀疏动作数据')
view_ids = sorted({accessor['bufferView'] for accessor in accessors})
views = []; output = bytearray()
for index in view_ids:
    view = doc['bufferViews'][index].copy()
    if view.get('buffer') != 0: raise ValueError('不支持外部缓冲区')
    start, length = view.get('byteOffset', 0), view['byteLength']
    if start + length > len(binary): raise ValueError('动作数据越界')
    while len(output) % 4: output.append(0)
    view['byteOffset'] = len(output); output.extend(binary[start:start + length]); views.append(view)
while len(output) % 4: output.append(0)
for accessor in accessors: accessor['bufferView'] = view_ids.index(accessor['bufferView'])
animations = doc['animations']
for animation in animations:
    for sampler in animation['samplers']:
        for key in ['input','output']: sampler[key] = accessor_ids.index(sampler[key])
nodes = [{k:v for k,v in node.items() if k not in ('mesh','skin','weights')} for node in doc['nodes']]
result = {'asset': doc['asset'], 'scene': doc.get('scene', 0), 'scenes': doc['scenes'], 'nodes': nodes,
          'animations': animations, 'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': len(output)}]}
encoded = json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode(); encoded += b' ' * ((-len(encoded)) % 4)
size = 12 + 8 + len(encoded) + 8 + len(output)
target.write_bytes(struct.pack('<4sII', b'glTF', 2, size) + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + struct.pack('<II', len(output), 0x004e4942) + output)
print(f'{source.name}: {len(data)} → {size} 字节；动作数据与骨架节点完整保留')
