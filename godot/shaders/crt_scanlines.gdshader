shader_type canvas_item;

// Strict 3-Color CRT Post-Processing Shader
// Guarantees every visible pixel is locked strictly to:
// 1. Black (#000000)
// 2. White (#FFFFFF)
// 3. Red   (#FF0000)
// Plus crisp 1-bit scanline blanking (alternating black raster lines)

uniform sampler2D screen_texture : hint_screen_texture, filter_nearest;
uniform bool scanlines_enabled = true;

void fragment() {
    vec2 uv = SCREEN_UV;
    
    // Read raw screen pixel
    vec4 c = texture(screen_texture, uv);
    
    // Exact 3 colors
    const vec3 C_BLACK = vec3(0.0, 0.0, 0.0);
    const vec3 C_WHITE = vec3(1.0, 1.0, 1.0);
    const vec3 C_RED   = vec3(1.0, 0.0, 0.0);
    
    // Calculate Euclidean distance to each of the 3 allowed colors
    float d_black = distance(c.rgb, C_BLACK);
    float d_white = distance(c.rgb, C_WHITE);
    float d_red   = distance(c.rgb, C_RED);
    
    // Quantize strictly to the nearest of the 3 colors
    vec3 snapped_color = C_BLACK;
    float min_dist = d_black;
    
    if (d_white < min_dist) {
        min_dist = d_white;
        snapped_color = C_WHITE;
    }
    if (d_red < min_dist) {
        min_dist = d_red;
        snapped_color = C_RED;
    }
    
    // 1-Bit Scanline blanking: blank every 3rd scanline to pure black
    if (scanlines_enabled) {
        float line_idx = mod(floor(FRAGCOORD.y), 3.0);
        if (line_idx < 1.0) {
            snapped_color = C_BLACK;
        }
    }
    
    COLOR = vec4(snapped_color, 1.0);
}
