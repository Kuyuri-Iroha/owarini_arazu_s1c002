#version 300 es
precision highp float;

in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexcoord;

out vec4 outColor;

void main() {
  vec3 light = normalize(vec3(0.5, 1.5, 1.5));
  float diff = max(dot(light, vNormal), 0.4);
  vec2 scaledUV = floor(vTexcoord * 50.0);
  float uvCol = step(0.5, mod(scaledUV.x + scaledUV.y, 2.0));
  outColor = vec4(vec3(clamp(uvCol, 0.5, 0.8)) * diff, 1.0);
}
