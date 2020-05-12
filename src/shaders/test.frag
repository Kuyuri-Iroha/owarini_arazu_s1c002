#version 300 es
precision highp float;

in vec3 vPosition;
flat in vec3 vNormal;
flat in vec4 vColor;

out vec4 outColor;

void main()
{
  vec3 light = normalize(vec3(0.5, 0.5, -0.5));
  float diff = max(dot(light, vNormal), 0.1);
  outColor = vColor * diff;
  outColor = vec4(1.0);
}