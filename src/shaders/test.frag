#version 300 es
precision highp float;

in vec3 vPosition;
flat in vec3 vNormal;
flat in vec4 vColor;

out vec4 outColor;

void main() {
  vec3 light = normalize(vec3(0.5, 1.5, 1.5));
  float diff = max(dot(light, vNormal), 0.4);
  outColor = vec4(vColor.rgb * diff, vColor.a);
}
