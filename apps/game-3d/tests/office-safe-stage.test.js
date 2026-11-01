import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OfficeSafeStage } from '../src/office-safe-stage.js';

test('正式保险柜的独立柜门转动，调包后留书并可恢复', async () => {
  const data = await readFile(new URL('../public/assets/models/office-safe.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  const anchor = new THREE.Group(), stage = new OfficeSafeStage(anchor, false);
  const model = gltf.scene.clone(true); model.userData.externalAsset = true; anchor.add(model);
  stage.sync(false);
  assert.ok(stage.door, '模型稍后载入时仍应绑定柜门');
  assert.equal(model.getObjectByName('保险柜主体').visible, false);
  assert.equal(stage.ledger.visible, true); assert.equal(stage.bible.visible, false);
  stage.sync(true); stage.update(.4);
  assert.ok(stage.door.rotation.y < 0 && stage.door.rotation.y > -1.48);
  stage.update(.4);
  assert.equal(stage.door.rotation.y, -1.48);
  assert.equal(stage.ledger.visible, false); assert.equal(stage.bible.visible, true);
  assert.equal(gltf.scene.getObjectByName('保险柜主体').visible, true, '不能修改缓存源模型');
  const restoredAnchor = new THREE.Group(), restoredModel = gltf.scene.clone(true);
  restoredModel.userData.externalAsset = true; restoredAnchor.add(restoredModel);
  const restored = new OfficeSafeStage(restoredAnchor, true);
  assert.equal(restored.door.rotation.y, -1.48);
  assert.equal(restored.bible.visible, true);
});
