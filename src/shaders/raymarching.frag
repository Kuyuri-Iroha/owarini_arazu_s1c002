#version 300 es
precision highp float;

uniform sampler2D colorTex;
uniform sampler2D depthTex;
uniform sampler2D normalTex;
uniform vec2 resolution;
uniform float time;
uniform vec3 cameraPosition;
uniform vec3 cameraCenter;
uniform vec3 cameraUp;
uniform float fov;

layout(location = 0) out vec4 gbuffer0;
layout(location = 1) out vec4 gbuffer1;
layout(location = 2) out vec4 gbuffer2;

#define LOOP_MAX 216
#define EPS 1e-4
#define HORIZONTAL_AA 1
#define saturate(x) clamp(x, 0.0, 1.0)
#define sim(x, y) (abs(x - y) < EPS)

const float PI = acos(-1.0);
const float PI2 = PI * 2.0;

// https://thebookofshaders.com/10/?lan=jp
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// https://qiita.com/kaneta1992/items/21149c78159bd27e0860
mat2 rot(float r) {
  float c = cos(r), s = sin(r);
  return mat2(c, s, -s, c);
}

vec2 pmod(vec2 p, float r) {
  float a = atan(p.x, p.y) + PI / r;
  float n = PI2 / r;
  a = floor(a / n) * n;
  return p * rot(-a);
}

// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sphere(vec3 p, float s) { return length(p) - s; }

float cappedCylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(h, r);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

vec3 repLim2(vec3 p, vec3 c, vec3 l) {
  return p - c * clamp(round(p / c), -l, l);
}

float box(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float octahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// http://mercury.sexy/hg_sdf/
float fOpUnionRound(float a, float b, float r) {
  vec2 u = max(vec2(r - a, r - b), vec2(0));
  return max(r, min(a, b)) - length(u);
}

// The "Stairs" flavour produces n-1 steps of a staircase:
// much less stupid version by paniq
float fOpUnionStairs(float a, float b, float r, float n) {
  float s = r / n;
  float u = b - r;
  return min(min(a, b), 0.5 * (u + a + abs((mod(u - a + s, 2.0 * s)) - s)));
}

float centerMap(vec3 p) {
  vec3 centerP = p + vec3(0.0, -0.04, -0.6);

  centerP.xz = centerP.xz * rot(time * PI * -0.4);
  centerP.xz = centerP.xz * rot(PI * 4.0 * centerP.y);
  centerP.xz = pmod(centerP.xz, 8.0) * 0.1;
  centerP.z -= 0.05 * (1.8 - abs(centerP.y) / 0.1) * 0.1;

  return box(centerP, vec3(0.001, 0.2, 0.001));
}

float coreMap(vec3 p) {
  vec3 coreP = p + vec3(0.0, -0.04, -0.6);

  coreP.xz = coreP.xz * rot(time * PI * 0.2);

  return octahedron(coreP, 0.05);
}

float map(vec3 p) {
  vec2 seedP = p.xz;
  seedP += vec2(EPS, 0.5);
  vec2 seed = vec2(floor(seedP.x), floor(seedP.y + EPS));

  vec3 sphereP = p;
  float sphereC = 0.6;
  sphereP.xz += vec2(sphereC * 0.5, -0.3);
  sphereP =
      repLim2(vec3(sphereP), vec3(sphereC, 0.0, 1.0), vec3(1.0, 1.0, 3.0));
  sphereP.y -= mod(time * 0.6 - random(seed) * 5.0, 3.0);
  sphereP.y += 0.5;

  vec3 pillarP = p;
  float pillarC = 0.8;
  pillarP.z -= 0.3;
  pillarP.x = abs(pillarP.x) - 0.7;
  pillarP.z = mod(pillarP.z + 0.5 * pillarC, pillarC) - 0.5 * pillarC - 0.2;

  vec3 dentP = pillarP;
  dentP.y -= 0.94;
  dentP.xz = pmod(dentP.xz, 20.0);
  dentP.z -= 0.1;

  float sphereDE = sphere(sphereP, 0.05);
  float pillarDE = cappedCylinder(pillarP, 0.1, 1.1);
  float dentDE = box(dentP, vec3(0.004, 1.1, 0.01));
  float planeDE = dot(p, vec3(0.0, 1.0, 0.0)) + 0.2;

  float milk = fOpUnionRound(sphereDE, planeDE, 0.07);
  float pillars = fOpUnionStairs(planeDE, max(-dentDE, pillarDE), 0.07, 5.0);
  float center = min(centerMap(p), coreMap(p));
  return min(min(milk, pillars), center);
}

// normal
vec3 norm(vec3 p) {
  return normalize(
      vec3(map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
           map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),
           map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))));
}

// color
vec3 objMat(vec3 rp) {
    vec3 albedo = vec3(0.4);
    return albedo;
}

vec3 centerMat(vec3 rp) {
    vec3 albedo = vec3(0.15);
    return albedo;
}

vec3 coreMat(vec3 rp) {
    vec3 albedo = vec3(1.0);
    return albedo;
}

void march(vec2 p, float faceDepth, out vec3 outColor, out float outDepth,
           out vec3 outNormal, out float noHit) {
  vec3 cp = cameraPosition;
  vec3 cd = normalize(cameraCenter - cp);
  vec3 cs = normalize(cross(cd, cameraUp));
  vec3 cu = normalize(cross(cs, cd));
  float td = 1.0 / tan(fov / 2.7);

  vec3 ro = cp;
  vec3 rd = normalize(cs * p.x + cu * p.y + cd * td);

  vec3 col = vec3(0.0, 0.0, 0.0);
  float depth = 1.0;

  int i = 0;
  for (; i < LOOP_MAX; i++) {
    vec3 rp = cp + rd * depth;
    float dist = map(rp);

    if (faceDepth < (depth - 1.0)) {
      noHit = 1.0;
      depth += dist;
      break;
    }

    if (abs(dist) < EPS) {
      if (sim(dist, centerMap(rp))) {
        col = centerMat(rp);
      } else if (sim(dist, coreMap(rp))) {
        col = coreMat(rp);
      } else {
        col = objMat(rp);
      }

      outNormal = norm(rp);
      depth += dist;
      break;
    }

    depth += dist;
  }

  if (i == LOOP_MAX - 1) {
    noHit = 1.0;
  }

  outDepth = (depth - 1.0); // 初期値が 1.0 であるため
  outColor = col;
}

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / resolution;
  vec2 uv = p * 0.5 + 0.5;
  p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  vec4 geoDepthCol = texture(depthTex, uv);
  float geoDepth = geoDepthCol.a < 0.1 ? 10000.0 : geoDepthCol.z;
  vec3 col = vec3(0.0);
  vec3 norm = vec3(0.0);
  float depth = 10000.0;
  float noHit = 0.0;
  march(p, geoDepth, col, depth, norm, noHit);

  gbuffer0 = noHit == 1.0 ? texture(colorTex, uv) : vec4(col, 1.0);
  gbuffer1 = noHit == 1.0 ? geoDepthCol : vec4(vec3(depth), 1.0);
  gbuffer2 = noHit == 1.0
                 ? texture(normalTex, uv)
                 : vec4(normalize(vec3(norm.x, norm.y, norm.z)), 1.0);
}