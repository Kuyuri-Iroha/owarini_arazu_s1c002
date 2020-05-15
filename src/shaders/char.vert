#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 texcoord;

uniform mat4 mMatrix;
uniform mat4 vpMatrix;

out vec2 vTexcoord;

void main() {
  vTexcoord = texcoord;
  vec3 pos = (mMatrix * vec4(position, 1.0)).xyz;
  gl_Position = vpMatrix * vec4(pos, 1.0);
}