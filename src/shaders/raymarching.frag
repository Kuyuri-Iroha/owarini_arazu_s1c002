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

const float PI = acos(-1.0);
const float PI2 = PI * 2.0;

#define SPEED 1.3

#define rot(x) mat2(cos(x), -sin(x), sin(x), cos(x))

// Forked from https://www.shadertoy.com/view/3tGSR3
vec3 path(float z) {
  z *= 0.5;
  return vec3(sin(z + cos(z * 0.7)) * 0.7, cos(z + cos(z * 1.2)) * 0.6, 0.) *
         0.4;
}

float map(vec3 p) {
  float d = 10e6;
  vec3 w = p;
  w = abs(w);

  p -= path(p.z);

  p.xy *= rot(sin(w.z * 2.9 + p.z * 0.7 +
              sin(w.x * 2. + w.z * 4. + time * 0. + 0.5) + w.z * 0.1) *
              1.6);

  float flTop = (-p.y + 1.1) * 2.3;
  float flBot = (p.y + 1.8) * 1.3;
  float floors = min(flBot, flTop);
  d = min(d, floors);
  return d;
}

vec3 norm(vec3 p) {
  return normalize(
      vec3(map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
           map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),
           map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))));
}

void march(vec2 p, float faceDepth, out vec3 outRp, out vec3 outColor,
           out float outDepth, out vec3 outNormal, out float noHit) {
  vec3 cp = cameraPosition + vec3(0.0, -0.3, 0.0);
  vec3 cd = normalize(cameraCenter - vec3(0.0, 0.4, 0.0) - cp);

  vec3 cs = normalize(cross(cd, cameraUp));
  vec3 cu = normalize(cross(cs, cd));
  float td = 1.0 / tan(90.0 / 2.7);

  vec3 rd = normalize(cs * p.x + cu * p.y + cd * td);

  float addedTime = time + 0.0;
  cp.z += addedTime * SPEED;
  cp += path(cp.z);
  cd = vec3(0, 0, cp.z + 1.0);
  cd += path(cd.z);

  vec3 col = vec3(0.0, 0.0, 0.0);
  float depth = 1.0;

  vec3 rp = cp;
  int i = 0;
  for (; i < LOOP_MAX; i++) {
    rp = cp + rd * depth;
    float dist = map(rp);

    if (faceDepth < (depth - 1.0)) {
      noHit = 1.0;
      depth += dist;
      break;
    }

    if (abs(dist) < EPS) {
      outNormal = abs(norm(rp));
      depth += dist;
      break;
    }

    depth += dist;
  }

  if (i == LOOP_MAX - 1) {
    noHit = 1.0;
  }

  outRp = rp;
  outDepth = (depth - 1.0) * 8.0;
  outColor =
      sqrt(pow(vec3(outNormal.x * 0.6, outNormal.z * 0.0, outNormal.y * 1.0),
               vec3(3.0)));
}

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / resolution;
  vec2 uv = p * 0.5 + 0.5;
  p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  vec4 geoDepthCol = texture(depthTex, uv);
  float geoDepth = geoDepthCol.a < 0.1 ? 10000.0 : geoDepthCol.z;
  vec3 rp = vec3(0.0);
  vec3 col = vec3(0.0);
  vec3 norm = vec3(0.0);
  float depth = 10000.0;
  float noHit = 0.0;
  march(p, geoDepth, rp, col, depth, norm, noHit);

  gbuffer0 = noHit == 1.0 ? texture(colorTex, uv) : vec4(col, depth);
  gbuffer1 = noHit == 1.0 ? geoDepthCol : vec4(rp, 1.0);
  gbuffer2 = noHit == 1.0 ? texture(normalTex, uv)
                          : vec4(normalize(vec3(norm.x, norm.y, norm.z)), 0.0);
}