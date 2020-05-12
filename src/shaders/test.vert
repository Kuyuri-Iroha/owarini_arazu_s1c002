#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec4 color;

uniform mat4 mMatrix;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;

out vec3 vPosition;
flat out vec3 vNormal;
flat out vec4 vColor;

void main() {
  vPosition = (mMatrix * vec4(position, 1.0)).xyz;
  vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
  vColor = color;
  gl_Position = mvpMatrix * vec4(position, 1.0);
}