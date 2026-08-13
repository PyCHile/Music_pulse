import * as THREE from 'three';
import type { Encounter } from './EncounterPlanner';

interface ActiveEncounter { encounter: Encounter; object: THREE.Object3D; age: number; velocity: THREE.Vector3; }

export class FocalTrajectoryEngine {
  readonly group = new THREE.Group();
  private active: ActiveEncounter[] = [];
  private autonomousClock = 0;

  spawn(encounter: Encounter): void {
    const object = this.createObject(encounter);
    object.position.set(encounter.spawnPosition.x * 10, encounter.spawnPosition.y * 7, -110);
    object.scale.setScalar(Math.max(.15, encounter.scale));
    this.group.add(object);
    const v = new THREE.Vector3(encounter.trajectoryVector.x, encounter.trajectoryVector.y, Math.abs(encounter.trajectoryVector.z || 1)).normalize();
    this.active.push({ encounter, object, age: 0, velocity: v });
  }

  update(dt: number): void {
    this.autonomousClock += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      const speed = Math.max(.08, item.encounter.speed) * 18;
      item.object.position.addScaledVector(item.velocity, speed * dt);
      if (!item.encounter.focalApproach) item.object.position.x += Math.sin(item.age * .45 + i) * .015;
      item.object.rotation.y += dt * .08;
      item.object.rotation.z += dt * .025;
      if (item.age > item.encounter.durationSeconds || item.object.position.z > 12) {
        this.group.remove(item.object);
        this.disposeObject(item.object);
        this.active.splice(i, 1);
      }
    }
  }

  updateAutonomous(dt: number): void {
    this.autonomousClock += dt;
    this.group.rotation.z = Math.sin(this.autonomousClock * .05) * .008;
    this.group.position.x = Math.sin(this.autonomousClock * .09) * .06;
  }

  dispose(): void {
    this.active.forEach((item) => this.disposeObject(item.object));
    this.active = [];
    this.group.clear();
  }

  private createObject(encounter: Encounter): THREE.Object3D {
    const color = new THREE.Color(encounter.palette[0] ?? '#ffffff');
    const emissive = new THREE.Color(encounter.palette[1] ?? encounter.palette[0] ?? '#ffffff');
    const material = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: Math.max(0, encounter.luminosity), roughness: .7, metalness: .08, transparent: true, opacity: .82 });
    let geometry: THREE.BufferGeometry;
    switch (encounter.objectType) {
      case 'planet': geometry = new THREE.IcosahedronGeometry(1.5, 3); break;
      case 'comet': geometry = new THREE.ConeGeometry(.35, 3.8, 12); break;
      case 'vessel': geometry = new THREE.OctahedronGeometry(1.1, 0); break;
      case 'void_pulse': geometry = new THREE.TorusGeometry(1.8, .10, 10, 48); break;
      case 'light_filament': geometry = new THREE.CylinderGeometry(.035, .16, 5.5, 8); break;
      default: geometry = new THREE.DodecahedronGeometry(.75, 0); break;
    }
    const mesh = new THREE.Mesh(geometry, material);
    if (encounter.objectType === 'comet' || encounter.objectType === 'light_filament') mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose()); else material?.dispose?.();
    });
  }
}
