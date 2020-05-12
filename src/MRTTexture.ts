import Texture2D from './Texture2D';
import Renderer from './Renderer';

export default class {
  width: number;
  height: number;
  frameBuffer: WebGLFramebuffer | null;
  texture: Texture2D[] = [];

  constructor(width: number, height: number, mrtNum: number, type: number) {
    const gl = Renderer.gl;

    this.width = width;
    this.height = height;
    this.frameBuffer = gl.createFramebuffer();

    for (let ti = 0; ti < mrtNum; ti++) {
      this.texture[ti] = new Texture2D(width, height);
      this.texture[ti].setImageData(null, type);
    }

    this.bind();
    for (let ti = 0; ti < this.texture.length; ti++) {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + ti,
        gl.TEXTURE_2D,
        this.texture[ti].texture,
        0
      );
    }
    this.unBind();
  }

  bind(): void {
    const gl = Renderer.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    let bufferList = [];
    for (let ti = 0; ti < this.texture.length; ti++) {
      bufferList[ti] = gl.COLOR_ATTACHMENT0 + ti;
    }
    gl.drawBuffers(bufferList);
  }

  unBind(): void {
    Renderer.gl.bindFramebuffer(Renderer.gl.FRAMEBUFFER, null);
  }

  setViewport(): void {
    Renderer.gl.viewport(0.0, 0.0, this.width, this.height);
  }
}
