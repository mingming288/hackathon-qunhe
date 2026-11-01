import { canStand, MOVEMENT_SPEED_MULTIPLIER, moveWithCollision } from './movement.js';

const PROFILES = {
  cellCorridor: { guard: [0, 5, 1.1] },
  yard: {
    red: [2.6, 2.3, .85], brooks: [1.4, 2.2, .65], guard: [.9, 3.5, 1.05],
    warden: [1.5, 1.8, .8], tommy: [2, 2, 1], haywood: [2.2, 1.6, .9], floyd: [1.8, 2, .85],
  },
  library: { brooks: [1.5, 2.2, .65] },
  office: { warden: [1.2, 1.5, .8] },
  supermarket: { manager: [3, 2, .85] },
};
const OFFSETS = [[.7, .7], [0, 1], [-.7, .7], [-1, 0], [-.7, -.7], [0, -1], [.7, -.7], [1, 0], [0, 0]];
const INTERACTION_DISTANCE = 2.6;

export class NpcController {
  constructor(world) {
    this.world = world;
    this.actors = world.animations.map((anchor, index) => ({
      anchor, profile: PROFILES[world.config.id]?.[anchor.userData.assetKey],
      home: { x: anchor.position.x, z: anchor.position.z },
      next: index % OFFSETS.length, wait: index * .18, target: null,
    }));
  }

  destination(actor, colliders) {
    const { anchor, home, profile } = actor;
    for (let attempt = 0; attempt < OFFSETS.length; attempt++) {
      const offset = OFFSETS[actor.next++ % OFFSETS.length];
      const target = { x: home.x + offset[0] * profile[0], z: home.z + offset[1] * profile[1] };
      const dx = target.x - anchor.position.x, dz = target.z - anchor.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < .2) continue;
      // Check the whole segment so a destination across furniture is never chosen.
      const steps = Math.ceil(distance / .15);
      let clear = true;
      for (let step = 1; step <= steps; step++) {
        if (!canStand(anchor.position.x + dx * step / steps, anchor.position.z + dz * step / steps, this.world.config.size, colliders)) {
          clear = false; break;
        }
      }
      if (clear) return target;
    }
    return null;
  }

  move(actor, dt, hero) {
    const { anchor, profile } = actor;
    if (Math.hypot(anchor.position.x - hero.x, anchor.position.z - hero.z) <= INTERACTION_DISTANCE) return 0;
    actor.wait = Math.max(0, actor.wait - dt);
    if (actor.wait > 0) return 0;
    const collider = anchor.userData.collider;
    const colliders = this.world.colliders.filter(item => item !== collider);
    actor.target ||= this.destination(actor, colliders);
    if (!actor.target) { actor.wait = .5; return 0; }
    const dx = actor.target.x - anchor.position.x, dz = actor.target.z - anchor.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .06) { actor.target = null; actor.wait = 1.4; return 0; }
    const step = Math.min(distance, profile[2] * MOVEMENT_SPEED_MULTIPLIER * dt);
    const x = anchor.position.x, z = anchor.position.z;
    if (Math.hypot(x + dx / distance * step - hero.x, z + dz / distance * step - hero.z) <= INTERACTION_DISTANCE) return 0;
    moveWithCollision(anchor.position, dx / distance * step, dz / distance * step, this.world.config.size, colliders);
    const movedX = anchor.position.x - x, movedZ = anchor.position.z - z;
    const moved = Math.hypot(movedX, movedZ);
    if (collider) { collider.x = anchor.position.x; collider.z = anchor.position.z; }
    if (moved < .001) { actor.target = null; actor.wait = .5; return 0; }
    const desired = Math.atan2(movedX, movedZ);
    const turn = Math.atan2(Math.sin(desired - anchor.rotation.y), Math.cos(desired - anchor.rotation.y));
    anchor.rotation.y += turn * Math.min(1, dt * 8);
    return moved / dt;
  }

  update(dt, elapsed, hero, enabled = true) {
    for (const actor of this.actors) {
      const { anchor, profile } = actor;
      const speed = enabled && anchor.visible && profile && dt > 0 ? this.move(actor, dt, hero) : 0;
      anchor.userData.mixer?.setMoving?.(speed > .05);
      anchor.userData.animate(elapsed, profile ? speed / profile[2] : 0);
    }
  }
}
