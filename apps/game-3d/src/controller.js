import * as THREE from 'three';
import { moveWithCollision } from './movement.js';

// 这些房间墙边留有侧向空间，可安全调整镜头；管网等狭窄场景维持原避墙方式。
const SIDE_CAMERA_ROOMS = new Set(['cell', 'cellCorridor', 'library', 'office', 'solitary']);

export class ThirdPersonController {
  constructor(camera, player, canvas) {
    this.camera = camera; this.player = player; this.keys = new Set();
    this.yaw = 0; this.pitch = .55; this.distance = 7; this.drag = null; this.motionYaw = null;
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
      this.pitch = THREE.MathUtils.clamp(this.pitch + (event.clientY - this.drag.y) * .004, .15, 1.05);
      this.drag.x = event.clientX; this.drag.y = event.clientY;
    });
    const release = () => { this.drag = null; };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.distance = THREE.MathUtils.clamp(this.distance + event.deltaY * .006, 3.5, 12);
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
    if (!preserveView) { this.pitch = .55; this.distance = 7; }
    if (!preserveKeys) this.keys.clear();
    this.followDistance = null;
  }

  obstacleDistance(colliders, distance) {
    for (const collider of colliders || []) {
      if (!collider.camera) continue;
      this.bounds.min.set(collider.x - collider.w / 2 - .2, 0, collider.z - collider.d / 2 - .2);
      this.bounds.max.set(collider.x + collider.w / 2 + .2, collider.h + .15, collider.z + collider.d / 2 + .2);
      if (this.ray.intersectBox(this.bounds, this.hit)) {
        distance = Math.min(distance, Math.max(.25, this.hit.distanceTo(this.target) - .2));
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
    const distanceAt = yaw => {
      const offset = this.offset.set(Math.sin(yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(yaw) * Math.cos(this.pitch));
      this.ray.set(target, offset);
      return this.obstacleDistance(world.cameraColliders, this.obstacleDistance(world.colliders, this.distance));
    };
    if (moving && !this.drag && Math.hypot(this.player.position.x - beforeX, this.player.position.z - beforeZ) > .0001) {
      const desired = this.player.rotation.y + Math.PI;
      const angle = Math.atan2(Math.sin(desired - this.yaw), Math.cos(desired - this.yaw));
      const candidate = this.yaw + angle * (1 - Math.exp(-dt * 3));
      // 靠墙时让已有避障逻辑优先，避免镜头反复被墙推回。
      if (distanceAt(candidate) >= 2) this.yaw = candidate;
    }
    let distance = distanceAt(this.yaw), rerouted = false;
    // 镜头被挤进人物时转向可用的一侧；正在按住的方向保持到松键。
    if (SIDE_CAMERA_ROOMS.has(world.config.id) && distance < 2) {
      for (const angle of [Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
        const candidate = this.yaw + angle, available = distanceAt(candidate);
        if (available >= 3) {
          if (moving && this.motionYaw == null) this.motionYaw = this.yaw;
          this.yaw = candidate; distance = available; rerouted = true; break;
        }
      }
    }
    const offset = this.offset.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    // Follow translation immediately; only smooth the distance when leaving an obstruction.
    this.followDistance = rerouted || this.followDistance === null || this.followDistance > distance
      ? distance : THREE.MathUtils.lerp(this.followDistance, distance, 1 - Math.exp(-dt * 9));
    this.camera.position.copy(target).addScaledVector(offset, this.followDistance); this.camera.lookAt(target);
    return Math.hypot(this.player.position.x - beforeX, this.player.position.z - beforeZ) / Math.max(dt, .001);
  }
}
