export default class Renderer {
  private static _enabled: boolean = false;
  private static _gl: WebGL2RenderingContext;
  private static _canvas: HTMLCanvasElement;

  public static get gl(): WebGL2RenderingContext {
    if (Renderer._enabled === false) {
      [Renderer._canvas, Renderer._gl] = Renderer.createCanvasAndContext();
      document.body.appendChild(Renderer._canvas);

      Renderer._enabled = true;
    }

    return Renderer._gl;
  }

  public static get canvas(): HTMLCanvasElement {
    if (Renderer._enabled === false) {
      [Renderer._canvas, Renderer._gl] = Renderer.createCanvasAndContext();
      document.body.appendChild(Renderer._canvas);

      Renderer._enabled = true;
    }

    return Renderer._canvas;
  }

  private static createCanvasAndContext(): [
    HTMLCanvasElement,
    WebGL2RenderingContext
  ] {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gl = canvas.getContext('webgl2');

    if (gl === null) {
      throw new Error('Your browser not supported for WebGL2.');
    }

    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    gl.getExtension('ANGLE_instanced_arrays');

    return [canvas, gl];
  }
}
