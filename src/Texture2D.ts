import Renderer from './Renderer';

export default class {
  width: number;
  height: number;
  texture: WebGLTexture | null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.texture = Renderer.gl.createTexture();
  }

  bind(): void {
    Renderer.gl.bindTexture(Renderer.gl.TEXTURE_2D, this.texture);
  }

  unBind(): void {
    Renderer.gl.bindTexture(Renderer.gl.TEXTURE_2D, null);
  }

  setImageData(imageData: ArrayBufferView | null, type: number): void {
    const gl = Renderer.gl;
    this.bind();

    if (type === gl.UNSIGNED_BYTE) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        this.width,
        this.height,
        0,
        gl.RGBA,
        type,
        imageData
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        this.width,
        this.height,
        0,
        gl.RGBA,
        type,
        imageData
      );
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.unBind();
  }

  activate(slot: number): void {
    Renderer.gl.activeTexture(Renderer.gl.TEXTURE0 + slot);
    this.bind();
  }

  generateMipMap(): void {
    this.bind();
    Renderer.gl.generateMipmap(Renderer.gl.TEXTURE_2D);
    this.unBind();
  }

  setFilter(mag: number, min: number): void {
    const gl = Renderer.gl;

    this.bind();
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    this.unBind();
  }
}
