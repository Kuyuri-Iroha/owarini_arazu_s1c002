#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 texcoord;

uniform mat4 mMatrix;
uniform mat4 mvpMatrix;

out vec3 vScPostion;
out vec3 vPostion;
out vec3 vWorldNormal;
out vec2 vTexcoord;

void main() {
  vScPostion = (mvpMatrix * vec4(position, 1.0)).xyz;
  vPostion = (mMatrix * vec4(position, 1.0)).xyz;
  vWorldNormal = (vec4(normal, 1.0)).xyz;
  vTexcoord = texcoord;
  gl_Position = mvpMatrix * vec4(position, 1.0);
}