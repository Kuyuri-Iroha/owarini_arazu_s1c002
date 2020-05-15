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

#define SPEED 1.3

#define rot(x) mat2(cos(x), -sin(x), sin(x), cos(x))
#define pal(a, b, c, d, e) ((a) + (b)*sin(6.28 * ((c) * (d) + (e))))

vec3 path(float z) {
  z *= 0.5;
  return vec3(sin(z + cos(z * 0.7)) * 0.7, cos(z + cos(z * 1.2)) * 0.6, 0.) *
         0.7;
}

#define pmod(p, x) mod(p, x) - x * 0.5
float map(vec3 p) {
  float d = 10e6;

  // w is used for the lines
  // and p is used for the tunnel

  vec3 w = p;
  w = abs(w);

  // the tunnel is made by the next two lines, otherwise it's just to planes
  p -= path(p.z);

  p.xy *= rot(sin(w.z * 2.9 + p.z * 0.7 +
                  sin(w.x * 2. + w.z * 4. + time * 0. + 0.5) + w.z * 0.1) *
              1.6);

  float flTop = (-p.y + 1.2) * 2.3;
  float flBot = (p.y + 0.8) * 0.4;
  float floors = min(flBot, flTop);
  d = min(d, floors);
  /*
  const float sep = 0.2; // seperation between glowy lines

  w.y = pmod(w.y,sep);


  vec3 z = p;
  // random attenuation to feed to the glowy lines
  float atten = pow(abs(sin(z.z*0.2 + iTime*0.1)), 50.);
  float attenC = pow(abs(sin(z.z*0.1  + sin(z.x + iTime)*0.2 + sin(z.y*3.)*4. +
  iTime*0.2)), 100.); float attenB = pow(abs(sin(w.z*0.2  + sin(w.x + iTime)*0.2
  + sin(w.y*0.7)*4. + w.y*20. + iTime*0.2)), 10.); vec3 col = pal(0.1,0.6 -
  attenC*0.5,vec3(1.7  - atten*0.6,1.1,0.8),0.2 - atten*0.4 ,0.5 - attenB*0.6 );
      col = max(col, 0.);

  float sc = 60. - atten*55.;

  // distance to the glowy lines
  float dGlowzers = max(floors,-abs(w.y) + sep*0.5) - 0.02;

  // glow
  glowB += exp(-dGlowzers*(70.))*reflAtten*col*40.;
*/
  // d *= 0.65;
  return d;
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
  vec3 cp = cameraPosition + vec3(0.3, 0.4, 0.0);
  vec3 cd = normalize(cameraCenter - cp);

  vec3 cs = normalize(cross(cd, cameraUp));
  vec3 cu = normalize(cross(cs, cd));
  float td = 1.0 / tan(fov / 2.7);

  vec3 rd = normalize(cs * p.x + cu * p.y + cd * td);

  float addedTime = time + 700.0;
  cp.z += addedTime * SPEED - sin(addedTime) * SPEED * 0.3;
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

      col = vec3(depth, depth, depth);
      break;
    }

    depth += dist;
  }

  if (i == LOOP_MAX - 1) {
    noHit = 1.0;
  }

  outDepth = (depth - 1.0) * 8.0;
  //outColor = mix(vec3(0.6, 0.1, 0.1), vec3(0.1, 0.1, 0.7), rp.y);
  outColor = sqrt(pow(vec3(outNormal.x * 0.6, outNormal.z * 0.0, outNormal.y * 1.0), vec3(3.0)));
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
  gbuffer2 = noHit == 1.0 ? texture(normalTex, uv)
                          : vec4(normalize(vec3(norm.x, norm.y, norm.z)), 0.0);
}