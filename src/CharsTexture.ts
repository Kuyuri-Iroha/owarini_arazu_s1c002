import Texture2D from './Texture2D';

export default class CharsTexture {
  registeredChars: Map<string, number>;
  textures: Texture2D[];

  constructor(str: string) {
    this.registeredChars = new Map<string, number>();
    this.textures = [];

    for (let ci = 0; ci < str.length; ci++) {
      this.registeredChars.set(str[ci], ci);
      this.textures.push(new Texture2D(512, 512));

      const cjsText = new createjs.Text(
        str[ci],
        '500px Sawarabi Mincho',
        '#aa1a1a'
      );
      cjsText.cache(0, 0, 512, 512);
      /*
      const image = new Image();
      image.src = (cjsText.cacheCanvas as HTMLCanvasElement).toDataURL(
        'image/png'
      );
      */
      this.textures[ci].setImageDataFromTexImageSource(
        cjsText.cacheCanvas as HTMLCanvasElement,
        true
      );
    }
  }

  getCharTexture(char: string): Texture2D | null {
    const charIdx = this.registeredChars.get(char);
    return charIdx !== undefined ? this.textures[charIdx] : null;
  }
}
