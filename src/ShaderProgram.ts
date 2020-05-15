import Renderer from './Renderer';
import Shader from './Shader';
import Texture2D from './Texture2D';
import { mat4, vec3 } from 'gl-matrix';

export default class {
  public static createVBO(
    data: Float32Array,
    usage: number
  ): WebGLBuffer | null {
    const gl = Renderer.gl;
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  public static createIBO(data: Int16Array): WebGLBuffer | null {
    const gl = Renderer.gl;
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
  }

  program: WebGLProgram;
  uniformLocationCache: Map<string, WebGLUniformLocation | null>;
  attribLocationCache: Map<string, number>;

  constructor() {
    this.uniformLocationCache = new Map<string, WebGLUniformLocation | null>();
    this.attribLocationCache = new Map<string, number>();

    const tmp = Renderer.gl.createProgram();
    if (tmp === null) {
      console.log('Faild create program: ' + this);
      this.program = new WebGLProgram();
      return;
    }
    this.program = tmp;
  }

  link(vs: Shader, fs: Shader): void {
    vs.attach(this.program);
    fs.attach(this.program);
    Renderer.gl.linkProgram(this.program);
  }

  use(): void {
    Renderer.gl.useProgram(this.program);
  }

  getUniformLocaltion(name: string): WebGLUniformLocation | null {
    if (this.uniformLocationCache.has(name)) {
      return this.uniformLocationCache.get(name) as WebGLUniformLocation | null;
    }

    const location = Renderer.gl.getUniformLocation(this.program, name);
    this.uniformLocationCache.set(name, location);

    return location;
  }

  getAttribLocation(name: string): number {
    if (this.attribLocationCache.has(name)) {
      return this.attribLocationCache.get(name) as number;
    }

    const location = Renderer.gl.getAttribLocation(this.program, name);
    this.attribLocationCache.set(name, location);

    return location;
  }

  setAttribute(
    vbo: WebGLBuffer | null,
    name: string,
    size: number,
    type: number
  ): void {
    const gl = Renderer.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const location = this.getAttribLocation(name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, type, false, 0, 0);
  }

  setIBO(ibo: WebGLBuffer | null): void {
    Renderer.gl.bindBuffer(Renderer.gl.ELEMENT_ARRAY_BUFFER, ibo);
  }

  send1f(name: string, v1: number): void {
    Renderer.gl.uniform1f(this.getUniformLocaltion(name), v1);
  }

  send2f(name: string, v1: number, v2: number): void {
    Renderer.gl.uniform2f(this.getUniformLocaltion(name), v1, v2);
  }

  send1i(name: string, v1: number): void {
    Renderer.gl.uniform1i(this.getUniformLocaltion(name), v1);
  }

  sendMatrix4f(name: string, v1: mat4): void {
    Renderer.gl.uniformMatrix4fv(this.getUniformLocaltion(name), false, v1);
  }

  sendVector3f(name: string, v1: vec3): void {
    Renderer.gl.uniform3fv(this.getUniformLocaltion(name), v1);
  }

  sendTexture2D(name: string, tex: Texture2D, slot: number): void {
    tex.activate(slot);
    this.send1i(name, slot);
  }
}
