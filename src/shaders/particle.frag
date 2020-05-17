#version 300 es
precision highp float;

in vec3 vScPostion;
in vec3 vWorldNormal;
in vec2 vTexcoord;

layout (location = 0) out vec4 gbuffer0;
layout (location = 1) out vec4 gbuffer1;
layout (location = 2) out vec4 gbuffer2;

vec3 LightDir = normalize(vec3(1.0, 1.0, -1.0));

void main(void) {
  vec3 normal = normalize(vWorldNormal);

  vec2 scaledUV = floor(vTexcoord * 50.0);
  float uvCol = step(0.5, mod(scaledUV.x + scaledUV.y, 2.0));
  vec3 uvColV = vec3(clamp(uvCol, 0.15, 0.6));

  vec3 col = uvColV;

  gbuffer0 = vec4(vec3(vScPostion.x, vScPostion.y+0.3, 0.0), 1.0);
  gbuffer1 = vec4(vec3(vScPostion.z), 1.0);
  gbuffer2 = vec4(vWorldNormal, 1.0);
}