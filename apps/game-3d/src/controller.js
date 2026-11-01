import * as THREE from 'three';
import { moveWithCollision } from './movement.js';

// 这些房间墙边留有侧向空间，可安全调整镜头；管网等狭窄场景维持原避墙方式。
const SIDE_CAMERA_ROOMS = new Set(['cell', 'cellCorridor', 'library', 'office', 'solitary']);
export const DEFAULT_PITCH = Math.PI / 6;
export const DEFAULT_DISTANCE = 10;
const MIN_PITCH = Math.PI / 9, MAX_PITCH = Math.PI / 3;
const MAX_AVOID_TURN = 2.2;

export class ThirdPersonController {
  constructor(camera, player, canvas) {
    this.camera = camera; this.player = player; this.keys = new Set();
    this.yaw = 0; this.pitch = DEFAULT_PITCH; this.distance = DEFAULT_DISTANCE; this.drag = null; this.motionYaw = null;
    this.followDistance = null;
    this.up = new THREE.Vector3(0, 1, 0); this.direction = new THREE.Vector3();
    this.target = new THREE.Vector3(); this.offset = new THREE.Vector3();
    this.ray = new THREE.Ray(); this.hit = new THREE.Vector3(); this.bounds = new THREE.Box3();
    this.enabled = () => true;
    window.addEventListener('keydown', event => {
      if (!this.enabled() || event.target.closest('button, input, select')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.keys.clear(); });
    canvas.addEventListener('pointerdown', event => {
      if (!this.enabled()) return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId); canvas.focus();
    });
    canvas.addEventListener('pointermove', event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const turn = (event.clientX - this.drag.x) * .006;
      this.yaw -= turn;
      if (this.motionYaw !== null) this.motionYaw -= turn;
      this.pitch = THREE.MathUtils.clamp(this.pitch + (event.clientY - this.drag.y) * .004, MIN_PITCH, MAX_PITCH);
      this.drag.x = event.clientX; this.drag.y = event.clientY;
    });
    const release = () => { this.drag = null; };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.distance = THREE.MathUtils.clamp(this.distance + event.deltaY * .006, 4.5, 14);
    }, { passive: false });
    canvas.addEventListener('contextmenu', event => event.preventDefault());
    document.querySelectorAll('[data-move]').forEach(button => {
      const stop = event => { this.keys.delete(button.dataset.move); event.preventDefault(); };
      button.addEventListener('pointerdown', event => {
        if (!this.enabled()) return;
        event.preventDefault(); button.setPointerCapture(event.pointerId); this.keys.add(button.dataset.move);
      });
      button.addEventListener('pointerup', stop); button.addEventListener('pointercancel', stop);
    });
  }

  reset({ preserveKeys = false, preserveView = false } = {}) {
    this.yaw = 0; this.drag = null; this.motionYaw = null;
    if (!preserveView) { this.pitch = DEFAULT_PITCH; this.distance = DEFAULT_DISTANCE; }
    if (!preserveKeys) this.keys.clear();
    this.followDistance = null;
  }

  obstacleDistance(colliders, distance) {
    for (const collider of colliders || []) {
      if (!collider.camera) continue;
      this.bounds.min.set(collider.x - collider.w / 2 - .2, 0, collider.z - collider.d / 2 - .2);
      this.bounds.max.set(collider.x + collider.w / 2 + .2, collider.h + .15, collider.z + collider.d / 2 + .2);
      // 目标点处在墙的安全缓冲内时，允许镜头朝远离墙心的方向退出，避免卡在人物体内。
      if (this.bounds.containsPoint(this.target) &&
        (this.target.x - collider.x) * this.ray.direction.x + (this.target.z - collider.z) * this.ray.direction.z > 0) continue;
      if (this.ray.intersectBox(this.bounds, this.hit)) {
        distance = Math.min(distance, Math.max(.25, this.hit.distanceTo(this.target) - .3));
      }
    }
    return distance;
  }

  update(dt, world) {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const moving = this.enabled() && (x || z);
    // 载入时输入会临时停用，但仍按住方向键时应保留避障前的移动方向。
    if (!x && !z) this.motionYaw = null;
    const beforeX = this.player.position.x, beforeZ = this.player.position.z;
    if (moving) {
      // 一次连续按键使用同一参照方向，避免跟随转镜头时人物绕圈。
      if (this.motionYaw === null) this.motionYaw = this.yaw;
      const direction = this.direction.set(x, 0, z).normalize().applyAxisAngle(this.up, this.motionYaw ?? this.yaw);
      const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 5.2 : 3.3;
      moveWithCollision(this.player.position, direction.x * speed * dt, direction.z * speed * dt, world.config.size, world.colliders);
      const desired = Math.atan2(direction.x, direction.z);
      const angle = Math.atan2(Math.sin(desired - this.player.rotation.y), Math.cos(desired - this.player.rotation.y));
      this.player.rotation.y += angle * Math.min(1, dt * 13);
    }
    const target = this.target.copy(this.player.position); target.y += 1.45;
    const distanceAt = (yaw, pitch = this.pitch) => {
      const offset = this.offset.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      this.ray.set(target, offset);
      return this.obstacleDistance(world.cameraColliders, this.obstacleDistance(world.colliders, this.distance));
    };
    // 固定水平视角跟随人物位置；转身不会带着整个场景旋转。
    const cameraPitch = this.pitch;
    let distance = distanceAt(this.yaw);
    // 严重遮挡时缓慢转向可用的一侧，每帧仍裁剪距离以避免穿墙。
    if (SIDE_CAMERA_ROOMS.has(world.config.id) && distance < 4.5) {
      let bestAngle = null, bestDistance = distance;
      for (const angle of [Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
        const candidate = this.yaw + angle, available = distanceAt(candidate, cameraPitch);
        if (available > bestDistance + .05) { bestAngle = angle; bestDistance = available; }
        if (available >= 5.3) break;
      }
      if (bestAngle !== null) {
        if (moving && this.motionYaw == null) this.motionYaw = this.yaw;
        // 镜头几乎贴住人物时立即避让，防止墙面占满屏幕。
        this.yaw += distance < 2 ? bestAngle : THREE.MathUtils.clamp(bestAngle, -MAX_AVOID_TURN * dt, MAX_AVOID_TURN * dt);
        distance = distanceAt(this.yaw, cameraPitch);
      }
    }
    const offset = this.offset.set(Math.sin(this.yaw) * Math.cos(cameraPitch), Math.sin(cameraPitch), Math.cos(this.yaw) * Math.cos(cameraPitch));
    // Follow translation immediately; only smooth the distance when leaving an obstruction.
    this.followDistance = this.followDistance === null || this.followDistance > distance
      ? distance : THREE.MathUtils.lerp(this.followDistance, distance, 1 - Math.exp(-dt * 9));
    this.camera.position.copy(target).addScaledVector(offset, this.followDistance); this.camera.lookAt(target);
    return Math.hypot(this.player.position.x - beforeX, this.player.position.z - beforeZ) / Math.max(dt, .001);
  }
}
