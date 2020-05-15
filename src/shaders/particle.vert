#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 texcoord;
layout(location = 3) in vec3 instancePosition;

uniform mat4 mMatrix;
uniform mat4 vpMatrix;

out vec3 vScPostion;
out vec3 vWorldNormal;
out vec2 vTexcoord;

void main(void) {
  vec3 pos = (mMatrix * vec4(position, 1.0)).xyz;
  pos += instancePosition;
  vScPostion = (vpMatrix * vec4(pos, 1.0)).xyz;
  vWorldNormal = (mMatrix * vec4(normal, 1.0)).xyz;
  vTexcoord = texcoord;
  gl_Position = vpMatrix * vec4(pos, 1.0);
}