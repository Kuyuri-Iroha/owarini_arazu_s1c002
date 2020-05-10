import * as THREE from 'three';

export class Rendering {
  renderer: THREE.WebGLRenderer;

  constructor() {
    this.renderer = new THREE.WebGLRenderer();
  }
}
