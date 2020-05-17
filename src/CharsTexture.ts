import Texture2D from './Texture2D';
import Renderer from './Renderer';

export default class CharsTexture {
  registeredChars: Map<string, number>;
  textures: Texture2D[];

  constructor(str: string, size: number) {
    this.registeredChars = new Map<string, number>();
    this.textures = [];

    for (let ci = 0; ci < str.length; ci++) {
      this.registeredChars.set(str[ci], ci);
      this.textures.push(new Texture2D(size, size));

      const cjsText = new createjs.Text(
        str[ci],
        Math.floor(size / 100) * 100 + 'px Noto Serif JP',
        '#eee3e5'
      );
      cjsText.cache(0, 0, size, size);
      this.textures[ci].setImageDataFromTexImageSource(
        cjsText.cacheCanvas as HTMLCanvasElement,
        true
      );
      this.textures[ci].setFilter(Renderer.gl.LINEAR, Renderer.gl.LINEAR);
    }
  }

  getCharTexture(char: string): Texture2D | null {
    const charIdx = this.registeredChars.get(char);
    return charIdx !== undefined ? this.textures[charIdx] : null;
  }
}
