import { vec4, vec3, vec2, glMatrix } from 'gl-matrix';

export default class Utils {
  public static createSphereGeometry(
    row: number,
    column: number,
    rad: number,
    color?: vec4
  ) {
    const pos: vec3[] = [];
    const norm: vec3[] = [];
    const col: vec4[] = [];
    const uv: vec2[] = [];
    const idx: vec3[] = [];

    for (let i = 0; i <= row; i++) {
      const r = (Math.PI / row) * i;
      const ry = Math.cos(r);
      const rr = Math.sin(r);
      for (let j = 0; j <= column; j++) {
        const tr = ((Math.PI * 2) / column) * j;
        const tx = rr * rad * Math.cos(tr);
        const ty = ry * rad;
        const tz = rr * rad * Math.sin(tr);
        const rx = rr * Math.cos(tr);
        const rz = rr * Math.sin(tr);

        let tc = vec4.create();
        if (color) {
          tc = color;
        } else {
          tc = Utils.hsva((360 / row) * i, 1, 1, 1);
        }

        pos.push(vec3.fromValues(tx, ty, tz));
        norm.push(vec3.fromValues(rx, ry, rz));
        col.push(tc);
        uv.push(vec2.fromValues(1 - (1 / column) * j, (1 / row) * i));
      }
    }

    for (let i = 0; i < row; i++) {
      for (let j = 0; j < column; j++) {
        const r = (column + 1) * i + j;
        idx.push(vec3.fromValues(r, r + 1, r + column + 2));
        idx.push(vec3.fromValues(r, r + column + 2, r + column + 1));
      }
    }

    return { pos: pos, norm: norm, col: col, uv: uv, idx: idx };
  }

  public static hsva(h: number, s: number, v: number, a: number): vec4 {
    if (1 < s || 1 < v || 1 < a) return vec4.create();
    const th = h % 360;
    const i = Math.floor(th / 60);
    const f = th / 60 - i;
    const m = v * (1 - s);
    const n = v * (1 - s * f);
    const k = v * (1 - s * (1 - f));

    let color = vec4.create();

    if (glMatrix.equals(s, 0)) {
      color[0] = color[1] = color[2] = v;
      color[3] = a;
    } else {
      const r = [v, n, m, m, k, v];
      const g = [k, v, v, n, m, m];
      const b = [m, m, k, v, v, n];

      color[0] = r[i];
      color[1] = g[i];
      color[2] = b[i];
      color[3] = a;
    }

    return color;
  }

  /**
   * vec3配列からFloat32Arrayへ変換
   * @param src
   */
  public static getFloat32ArrayFromVec3Array(src: vec3[]): Float32Array {
    return new Float32Array(src.map((v) => [v[0], v[1], v[2]]).flat());
  }

  /**
   * vec4配列からFloat32Arrayへ変換
   * @param src
   */
  public static getFloat32ArrayFromVec4Array(src: vec4[]): Float32Array {
    return new Float32Array(src.map((v) => [v[0], v[1], v[2], v[3]]).flat());
  }

  /**
   * vec3配列からInt16Arrayへ変換
   * @param src
   */
  public static getInt16ArrayFromVec3Array(src: vec3[]): Int16Array {
    return new Int16Array(src.map((v) => [v[0], v[1], v[2]]).flat());
  }

  public static clamp(v: number, min: number, max: number): number {
    return Math.min(v, min, max);
  }
}
