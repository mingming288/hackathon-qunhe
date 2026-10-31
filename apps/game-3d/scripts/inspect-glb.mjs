import { createHash } from 'node:crypto';
import * as THREE from 'three';

// 只读检查交付文件，不解码贴图、不改写模型；边界按默认场景的静止姿态计算。
export function inspectGlb(data) {
  if (data.length < 20 || data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) {
    throw new Error('模型不是完整的第二版二进制三维文件');
  }
  let document, binary;
  for (let offset = 12; offset < data.length;) {
    if (offset + 8 > data.length) throw new Error('模型块头不完整');
    const size = data.readUInt32LE(offset), type = data.readUInt32LE(offset + 4);
    if (offset + 8 + size > data.length) throw new Error('模型块越界');
    const chunk = data.subarray(offset + 8, offset + 8 + size);
    if (type === 0x4e4f534a) document = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + size;
  }
  if (!document?.scenes?.length) throw new Error('模型没有场景');
  const buffers = document.buffers || [], views = document.bufferViews || [];
  const externalResources = [...buffers, ...(document.images || [])].filter(item => item.uri && !item.uri.startsWith('data:')).length;
  for (const view of views) {
    const buffer = buffers[view.buffer];
    const end = (view.byteOffset || 0) + view.byteLength;
    if (!buffer || end > buffer.byteLength || (!buffer.uri && (!binary || end > binary.length))) throw new Error('模型缓冲区引用不完整');
  }
  const bounds = new THREE.Box3(), warnings = new Set();
  let triangles = 0, meshInstances = 0, primitiveInstances = 0;
  function visit(index, parent, ancestors) {
    if (ancestors.has(index)) throw new Error('模型节点存在循环引用');
    const node = document.nodes?.[index];
    if (!node) throw new Error('模型节点引用不存在');
    const matrix = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
      new THREE.Vector3().fromArray(node.translation || [0, 0, 0]),
      new THREE.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]),
      new THREE.Vector3().fromArray(node.scale || [1, 1, 1])
    );
    const world = parent.clone().multiply(matrix), next = new Set(ancestors).add(index);
    if (node.mesh !== undefined) {
      const mesh = document.meshes?.[node.mesh];
      if (!mesh) throw new Error('模型网格引用不存在');
      meshInstances++;
      for (const primitive of mesh.primitives) {
        primitiveInstances++;
        const position = document.accessors?.[primitive.attributes.POSITION];
        const accessor = primitive.indices === undefined ? position : document.accessors?.[primitive.indices];
        if (!accessor) throw new Error('模型顶点或索引引用不存在');
        const count = accessor.count, mode = primitive.mode ?? 4;
        if (mode === 4) triangles += count / 3;
        else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2);
        else warnings.add('含非三角形图元，三角面统计不包含这些图元');
        if (position?.min && position?.max) {
          bounds.union(new THREE.Box3(new THREE.Vector3().fromArray(position.min), new THREE.Vector3().fromArray(position.max)).applyMatrix4(world));
        } else warnings.add('部分顶点缺少边界，尺寸统计可能不完整');
      }
    }
    for (const child of node.children || []) visit(child, world, next);
  }
  const scene = document.scenes[document.scene ?? 0];
  if (!scene) throw new Error('默认场景不存在');
  for (const node of scene.nodes || []) visit(node, new THREE.Matrix4(), new Set());
  if (document.skins?.length) warnings.add('有骨骼，边界未计算蒙皮与动画变形');
  const textures = (document.images || []).map(image => {
    const view = views[image.bufferView];
    const bytes = view && !buffers[view.buffer].uri ? binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength) : null;
    const png = bytes?.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return { name: image.name || '', mimeType: image.mimeType || null, bytes: bytes?.length ?? null,
      dimensions: png ? [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] : null };
  });
  const materials = (document.materials || []).map(material => ({
    name: material.name || '', baseColor: Boolean(material.pbrMetallicRoughness?.baseColorTexture),
    normal: Boolean(material.normalTexture), metallicRoughness: Boolean(material.pbrMetallicRoughness?.metallicRoughnessTexture),
    occlusion: Boolean(material.occlusionTexture), unlit: Boolean(material.extensions?.KHR_materials_unlit)
  }));
  return {
    bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), triangles, meshInstances, primitiveInstances,
    bounds: bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() },
    materials, textures, animations: (document.animations || []).map(item => item.name || '未命名动画'),
    externalResources, warnings: [...warnings]
  };
}
