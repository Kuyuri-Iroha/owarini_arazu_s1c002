#version 300 es
precision highp float;

in vec3 vScPostion;
in vec3 vWorldNormal;
in float vertexID;

layout(location = 0) out vec4 gbuffer0;
layout(location = 1) out vec4 gbuffer1;
layout(location = 2) out vec4 gbuffer2;

void main(void) {
  gbuffer0 = vec4(
      vec3(0.7, 0.7, 0.9) * max(pow((vertexID / 100.0), 2.0), 0.1) * 1.3, 0.4);
  gbuffer1 = vec4(vec3(vScPostion.z), 1.0);
  gbuffer2 = vec4(vWorldNormal, 0.0);
}