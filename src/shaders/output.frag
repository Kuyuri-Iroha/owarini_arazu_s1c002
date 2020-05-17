#version 300 es
precision highp float;

uniform sampler2D colorTex;
uniform sampler2D depthTex;
uniform sampler2D normalTex;
uniform vec2 resolution;
uniform vec3 camera;

layout (location = 0) out vec4 outColor;

#define saturate(x) clamp(x, 0.0, 1.0)

float genFog(float depth) {
    float density = 0.006;
    return 1.0 - saturate(1.0 / exp(pow(density * depth, 2.0)));
}

mat4 makeInv(vec3 pos) {
  return inverse(mat4(
    1.0, 0.0, 0.0, pos.x,
    0.0, 1.0, 0.0, pos.y,
    0.0, 0.0, 1.0, pos.z,
    0.0, 0.0, 0.0, 1.0
  ));
}

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / resolution;
  vec2 uv = p * 0.5 + 0.5;

  vec4 colorVal = texture(colorTex, uv);
  vec3 color = colorVal.rgb;
  float depth = colorVal.a;
  vec3 position = texture(depthTex, uv).rgb;
  vec4 normCol4 = texture(normalTex, uv);
  vec3 norm = normalize(normCol4.xyz);

  mat4 invMat = makeInv(position);
  vec3 invCam = normalize(invMat * vec4(camera, 0.0)).xyz;

  bool isRaymarch = normCol4.a == 0.0;
  vec3 light = normalize(vec3(2.0, 2.0, 2.2));
  float diff = isRaymarch ? 1.0 : (max(dot(light, norm), 0.4));

  float rim = pow(clamp(dot(norm, invCam), 0.0, 1.0), 5.0) * 1.0;
  vec3 ambient = vec3(0.08, 0.0, 0.1) + vec3(0.7, 0.0, 0.2) * rim;
  float fog = genFog(depth);
  vec3 fogCol = vec3(1.0, 1.0, 1.0) * 0.8;

  vec3 objCol = color * diff;
  objCol = diff < 0.93 ? vec3(0.0) : color;
  objCol += ambient;

  outColor = vec4(isRaymarch ? mix(objCol, fogCol, fog) : objCol, 1.0);
  //outColor = vec4(norm, 1.0);
}
