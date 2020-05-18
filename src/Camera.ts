import { vec3 } from 'gl-matrix';

export default class {
  position: vec3;
  center: vec3;
  up: vec3;
  constructor(defaultDistance: number) {
    this.position = vec3.fromValues(0.0, 0.0, defaultDistance);
    this.center = vec3.create();
    this.up = vec3.fromValues(0.0, 1.0, 0.0);
  }
}
