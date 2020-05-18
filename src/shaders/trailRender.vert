#version 300 es

uniform sampler2D positionTexture;
uniform mat4 mMatrix;
uniform mat4 vpMatrix;

out vec3 vScPostion;
out vec3 vWorldNormal;
out float vertexID;

void main(void) {
  vec3 pos =
      texelFetch(positionTexture, ivec2(gl_InstanceID, gl_VertexID), 0).xyz;
  pos = (mMatrix * vec4(pos, 1.0)).xyz;
  vScPostion = (vpMatrix * vec4(pos, 1.0)).xyz;
  vWorldNormal = vec3(0.0, 1.0, 0.0);
  vertexID = float(gl_VertexID);
  gl_Position = vpMatrix * vec4(pos, 1.0);
}