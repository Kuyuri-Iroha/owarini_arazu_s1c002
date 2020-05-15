#version 300 es
precision highp float;

uniform sampler2D colorTex;
uniform sampler2D depthTex;
uniform sampler2D normalTex;
uniform vec2 resolution;

layout (location = 0) out vec4 outColor;

#define saturate(x) clamp(x, 0.0, 1.0)

float genFog(float depth) {
    float density = 0.01;
    return 1.0 - saturate(1.0 / exp(pow(density * depth, 2.0)));
}

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / resolution;
  vec2 uv = p * 0.5 + 0.5;

  vec3 color = texture(colorTex, uv).rgb;
  float depth = texture(depthTex, uv).z;
  vec4 normCol4 = texture(normalTex, uv);
  vec3 norm = normalize(normCol4.xyz);
  if(normCol4.a == -1.0) {
    vec3 v0 = normalize(texture(depthTex, uv + vec2(1, 0.0)).xyz - texture(depthTex, uv + vec2(-1, 0.0)).xyz);
    vec3 v1 = normalize(texture(depthTex, uv + vec2(0.0, 1)).xyz - texture(depthTex, uv + vec2(0.0, -1)).xyz);
    norm = normalize(cross(v0, v1));
  }

  vec3 light = normalize(vec3(-2.0, -3.0, 0.2));
  float diff = normCol4.a == 0.0 ? 1.0 : (max(dot(light, norm), 0.4));

  vec3 ambient = vec3(0.08, 0.0, 0.1);
  float fog = genFog(depth);
  vec3 fogCol = vec3(1.0, 1.0, 1.0) * 0.5;

  vec3 objCol = color * diff + ambient;

  outColor = vec4(mix(objCol, fogCol, fog), 1.0);
  //outColor = vec4(norm, 1.0);
}
