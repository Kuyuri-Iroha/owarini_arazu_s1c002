import { vec2, vec3, quat } from 'gl-matrix';
import Utils from './Utils';

export default class {
  distance: number;
  defDistance: number;
  position: vec3;
  center: vec3;
  up: vec3;
  defPosition: vec3;
  defCenter: vec3;
  defUp: vec3;
  rotate: vec2;
  scale: number;
  moving: boolean;
  prevMousePosition: vec2;
  offsetMousePosition: vec2;
  qt: quat;
  qtx: quat;
  qty: quat;

  constructor(defaultDistance: number) {
    this.distance = this.defDistance = defaultDistance;
    this.position = vec3.fromValues(0.0, 0.0, this.distance);
    this.center = vec3.create();
    this.up = vec3.fromValues(0.0, 1.0, 0.0);
    this.defPosition = vec3.copy(vec3.create(), this.position);
    this.defCenter = vec3.copy(vec3.create(), this.center);
    this.defUp = vec3.copy(vec3.create(), this.up);
    this.rotate = vec2.create();
    this.scale = 0.0;
    this.moving = false;
    this.prevMousePosition = vec2.create();
    this.offsetMousePosition = vec2.create();
    this.qt = quat.identity(quat.create());
    this.qtx = quat.identity(quat.create());
    this.qty = quat.identity(quat.create());
  }

  mouseInteractionStart(event: MouseEvent): void {
    this.moving = true;
    this.prevMousePosition[0] = event.pageX;
    this.prevMousePosition[1] = event.pageY;
    event.preventDefault();
  }

  mouseInteractionMove(event: MouseEvent): void {
    if (!this.moving) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = 1.0 / Math.min(w, h);
    this.offsetMousePosition[0] = event.pageX - this.prevMousePosition[0];
    this.offsetMousePosition[1] = event.pageY - this.prevMousePosition[1];
    this.prevMousePosition[0] = event.pageX;
    this.prevMousePosition[1] = event.pageY;

    switch (event.buttons) {
      case 1:
        vec2.scaleAndAdd(this.rotate, this.rotate, this.offsetMousePosition, s);
        this.rotate[0] = this.rotate[0] % 1.0;
        this.rotate[1] = Math.min(Math.max(this.rotate[1] % 1.0, -0.25), 0.25);
        break;
    }
  }

  mouseInteractionEnd(): void {
    this.moving = false;
  }

  update(): void {
    const PI2 = Math.PI * 2;
    const v = vec3.fromValues(1.0, 0.0, 0.0);
    this.scale *= 0.75;
    this.distance = Utils.clamp(
      this.distance + this.scale,
      this.defDistance * 0.1,
      this.defDistance * 2.0
    );
    this.defPosition[2] = this.distance;
    quat.identity(this.qt);
    quat.identity(this.qtx);
    quat.identity(this.qty);

    quat.rotateY(this.qtx, this.qtx, this.rotate[0] * PI2);
    vec3.transformQuat(v, v, this.qtx);
    quat.rotateX(this.qty, this.qty, this.rotate[1] * PI2);
    quat.multiply(this.qt, this.qtx, this.qty);
    vec3.transformQuat(this.position, this.defPosition, this.qt);
    vec3.transformQuat(this.up, this.defUp, this.qt);
  }
}
