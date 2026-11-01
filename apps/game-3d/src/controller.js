import * as THREE from 'three';
import { moveWithCollision } from './movement.js';

export class ThirdPersonController {
  constructor(camera, player, canvas) {
    this.camera = camera; this.player = player; this.keys = new Set();
    this.yaw = 0; this.pitch = .55; this.distance = 7; this.drag = null;
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
      this.yaw -= (event.clientX - this.drag.x) * .006;
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

  reset() {
    this.yaw = 0; this.pitch = .55; this.distance = 7; this.drag = null; this.keys.clear();
  }

  update(dt, world) {
    const has = (...keys) => keys.some(key => this.keys.has(key));
    const x = Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    const z = Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    const moving = this.enabled() && (x || z);
    const before = this.player.position.clone();
    if (moving) {
      const direction = new THREE.Vector3(x, 0, z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      const speed = has('ShiftLeft', 'ShiftRight') ? 5.2 : 3.3;
      moveWithCollision(this.player.position, direction.x * speed * dt, direction.z * speed * dt, world.config.size, world.colliders);
      const desired = Math.atan2(direction.x, direction.z);
      const angle = Math.atan2(Math.sin(desired - this.player.rotation.y), Math.cos(desired - this.player.rotation.y));
      this.player.rotation.y += angle * Math.min(1, dt * 13);
    }
    const target = this.player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const offset = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const ray = new THREE.Ray(target, offset);
    let distance = this.distance;
    const hit = new THREE.Vector3();
    for (const collider of [...world.colliders, ...(world.cameraColliders || [])]) {
      if (!collider.camera) continue;
      const bounds = new THREE.Box3(
        new THREE.Vector3(collider.x - collider.w / 2 - .2, 0, collider.z - collider.d / 2 - .2),
        new THREE.Vector3(collider.x + collider.w / 2 + .2, collider.h + .15, collider.z + collider.d / 2 + .2)
      );
      // 靠近墙面时镜头可以收近，不能用固定距离把镜头推过墙体。
      if (ray.intersectBox(bounds, hit)) distance = Math.min(distance, Math.max(.25, hit.distanceTo(target) - .2));
    }
    const desiredPosition = target.clone().addScaledVector(offset, distance);
    // 避墙时立即收近，离开遮挡后平滑拉远；保持角色外部的第三人称位置。
    const alpha = this.camera.position.distanceTo(target) > distance ? 1 : 1 - Math.exp(-dt * 9);
    this.camera.position.lerp(desiredPosition, alpha); this.camera.lookAt(target);
    return before.distanceTo(this.player.position) / Math.max(dt, .001);
  }
}
