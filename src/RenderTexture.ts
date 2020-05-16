import Texture2D from './Texture2D';
import Renderer from './Renderer';

export default class {
  width: number;
  height: number;
  frameBuffer: WebGLFramebuffer | null;
  texture2d: Texture2D;
  depthTexture: Texture2D | null;

  constructor(
    width: number,
    height: number,
    type: number,
    depthDisable?: boolean
  ) {
    const gl = Renderer.gl;

    this.width = width;
    this.height = height;
    this.frameBuffer = gl.createFramebuffer();

    this.texture2d = new Texture2D(width, height);
    this.texture2d.setImageData(null, type);

    this.depthTexture = depthDisable ? null : new Texture2D(width, height);
    if (this.depthTexture !== null) {
      this.depthTexture.setImageData(null, gl.FLOAT, gl.DEPTH_COMPONENT);
    }

    this.bind();
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture2d.texture,
      0
    );
    if (this.depthTexture !== null) {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.TEXTURE_2D,
        this.depthTexture.texture,
        0
      );
    }
    this.unBind();
  }

  bind(): void {
    const gl = Renderer.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    const bufferList = [gl.COLOR_ATTACHMENT0];
    gl.drawBuffers(bufferList);
  }

  unBind(): void {
    Renderer.gl.bindFramebuffer(Renderer.gl.FRAMEBUFFER, null);
  }

  setViewPort(): void {
    Renderer.gl.viewport(0.0, 0.0, this.width, this.height);
  }
}
