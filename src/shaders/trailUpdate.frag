#version 300 es
precision highp float;

#define PI 3.14159265359

layout(location = 0) out vec3 outPosition;
layout(location = 1) out vec3 outInitPosition;
layout(location = 2) out vec3 outCounter;

uniform sampler2D positionTexture;
uniform sampler2D initPositionTexture;
uniform sampler2D counterTexture;
uniform float time;

#define rot(x) mat2(cos(x), -sin(x), sin(x), cos(x))

vec3 path(float z) {
  z *= 0.5;
  return vec3(sin(z + cos(z * 0.7)) * 0.7, cos(z + cos(z * 1.2)) * 0.6, 0.) *
         0.4;
}

float random(vec4 x) {
  return fract(sin(dot(x, vec4(12.9898, 78.233, 39.425, 27.196))) * 43758.5453);
}
float valuenoise(vec4 x) {
  vec4 i = floor(x);
  vec4 f = fract(x);
  vec4 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mix(random(i + vec4(0.0, 0.0, 0.0, 0.0)),
                         random(i + vec4(1.0, 0.0, 0.0, 0.0)), u.x),
                     mix(random(i + vec4(0.0, 1.0, 0.0, 0.0)),
                         random(i + vec4(1.0, 1.0, 0.0, 0.0)), u.x),
                     u.y),
                 mix(mix(random(i + vec4(0.0, 0.0, 1.0, 0.0)),
                         random(i + vec4(1.0, 0.0, 1.0, 0.0)), u.x),
                     mix(random(i + vec4(0.0, 1.0, 1.0, 0.0)),
                         random(i + vec4(1.0, 1.0, 1.0, 0.0)), u.x),
                     u.y),
                 u.z),
             mix(mix(mix(random(i + vec4(0.0, 0.0, 0.0, 1.0)),
                         random(i + vec4(1.0, 0.0, 0.0, 1.0)), u.x),
                     mix(random(i + vec4(0.0, 1.0, 0.0, 1.0)),
                         random(i + vec4(1.0, 1.0, 0.0, 1.0)), u.x),
                     u.y),
                 mix(mix(random(i + vec4(0.0, 0.0, 1.0, 1.0)),
                         random(i + vec4(1.0, 0.0, 1.0, 1.0)), u.x),
                     mix(random(i + vec4(0.0, 1.0, 1.0, 1.0)),
                         random(i + vec4(1.0, 1.0, 1.0, 1.0)), u.x),
                     u.y),
                 u.z),
             u.w);
}
float fbm(vec4 x) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * valuenoise(x);
    amp *= 0.5;
    x *= 2.01;
  }
  return sum * 2.0 - 1.0;
}
float noiseX(vec4 x) {
  return fbm(x * 0.34 + vec4(4324.32, 7553.13, 5417.33, 1484.43));
}
float noiseY(vec4 x) {
  return fbm(x * 0.71 + vec4(1614.43, 8439.32, 4211.93, 8546.29));
}
float noiseZ(vec4 x) {
  return fbm(x * 0.54 + vec4(4342.34, 7569.34, 3812.42, 1589.54));
}
vec3 curlnoise(vec3 x, float inTime) {
  float e = 0.01;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  return vec3((noiseZ(vec4(x + dy, inTime)) - noiseZ(vec4(x - dy, inTime))) -
                  (noiseY(vec4(x + dz, inTime)) - noiseY(vec4(x - dz, inTime))),
              (noiseX(vec4(x + dz, inTime)) - noiseX(vec4(x - dz, inTime))) -
                  (noiseZ(vec4(x + dx, inTime)) - noiseZ(vec4(x - dx, inTime))),
              (noiseY(vec4(x + dx, inTime)) - noiseY(vec4(x - dx, inTime))) -
                  (noiseX(vec4(x + dy, inTime)) -
                   noiseX(vec4(x - dy, inTime)))) /
         (2.0 * e);
}
vec3 limit(vec3 v, float max) {
  if (length(v) > max) {
    return normalize(v) * max;
  }
  return v;
}
void main(void) {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec3 initPosition = texelFetch(initPositionTexture, coord, 0).xyz;
  vec3 headPos = texelFetch(positionTexture, ivec2(coord.x, 0), 0).xyz;
  vec3 headCounter = texelFetch(counterTexture, ivec2(coord.x, 0), 0).xyz;
  vec3 pos = initPosition;

  float countRefleshed = 0.0;
  if (0.5 < headCounter.z) {
    headCounter.y += 1.0;
    headCounter.z = 0.0;
    countRefleshed = 1.0;
  }

  float offsetZ = 12.0 * (headCounter.y);
  pos.z -= offsetZ;
  float animParam = (time * 2.0) + gl_FragCoord.y * 0.002;

  pos += vec3(0.0, 0.0, animParam * 0.5);
  vec3 pa = path(pos.z + time * 1.3);
  vec3 ns = curlnoise(pos / 2.0, time);

  if (10.0 < headPos.z && countRefleshed < 0.5) {
    headCounter.z = 1.0;
  }

  outInitPosition = initPosition;
  outPosition = pos;
  outCounter = headCounter;
}