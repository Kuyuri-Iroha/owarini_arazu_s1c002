import Renderer from './Renderer';

export default class {
  shader: WebGLShader | null = null;

  constructor(src: string, type: number) {
    this.compile(src, type);
  }

  compile(src: string, type: number): void {
    const gl = Renderer.gl;
    const sd = gl.createShader(type);

    if (sd === null) {
      console.error('Failed to compile the shader: ' + this);
      return;
    }

    this.shader = sd;
    gl.shaderSource(this.shader, src.replace(/^\n/, '')); // minify
    gl.compileShader(this.shader);
  }

  attach(program: WebGLProgram): void {
    Renderer.gl.attachShader(program, this.shader as WebGLShader);
  }

  delete(): void {
    Renderer.gl.deleteShader(this.shader);
  }
}
