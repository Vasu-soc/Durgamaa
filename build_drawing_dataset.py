import cv2
import numpy as np
import json
import base64
import struct

# Load high-res binary art
img = cv2.imread('high_res_durga_art.png', cv2.IMREAD_GRAYSCALE)
h, w = img.shape
print(f"Loaded art {w}x{h}")

# 1. Extract contours with hierarchy
contours, hierarchy = cv2.findContours(img, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)

strokes = []
total_pts = 0

for i, cnt in enumerate(contours):
    if len(cnt) < 4:
        continue
    # Douglas-Peucker simplification for smooth rendering
    epsilon = 0.75
    approx = cv2.approxPolyDP(cnt, epsilon, True)
    if len(approx) < 3:
        approx = cnt

    M = cv2.moments(cnt)
    if M["m00"] > 0:
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]
    else:
        cx, cy = approx[0][0]

    area = cv2.contourArea(cnt)

    # Classify order:
    # 1. Crown / Halo top: cy < 150
    # 2. Face / Head: 130 <= cy <= 220, 280 <= cx <= 440
    # 3. Arms & Weapons: cy <= 320, outer sides
    # 4. Torso & Sari: 200 <= cy <= 480, center
    # 5. Lion Face & Mane: cx < 280, cy >= 280
    # 6. Lion Body & Legs: cy >= 400
    # 7. Lion Tail: cx > 500, cy >= 320

    if cy < 150:
        cat = 1
        order = cy * 0.7
    elif 130 <= cy <= 220 and 280 <= cx <= 440:
        cat = 2
        order = 120 + cy * 0.5
    elif cy <= 330 and (cx < 280 or cx > 440):
        cat = 3
        order = 200 + cy * 0.6
    elif 200 <= cy <= 480 and 260 <= cx <= 520:
        cat = 4
        order = 300 + cy * 0.7
    elif cx < 280 and cy >= 280:
        cat = 5
        order = 400 + cy * 0.8
    elif cx > 500 and cy >= 320:
        cat = 7
        order = 600 + cy
    else:
        cat = 6
        order = 500 + cy * 0.8

    # Convert to normalized coordinates in the 9:16 target stage:
    # In 9:16 canvas, let Durga art occupy:
    # x: 0.08 to 0.92 (width = 0.84)
    # y: center around 0.53, height = 0.84 * (h/w) * (9/16)
    target_scale_x = 0.84
    aspect_ratio_art = h / w  # 621 / 800 = 0.776
    target_scale_y = target_scale_x * aspect_ratio_art * (9.0 / 16.0) # ~ 0.366

    offset_x = (1.0 - target_scale_x) / 2.0  # 0.08
    offset_y = 0.34  # start around y=0.34, extends to ~0.706

    pts = []
    for p in approx:
        nx = offset_x + (float(p[0][0]) / (w - 1)) * target_scale_x
        ny = offset_y + (float(p[0][1]) / (h - 1)) * target_scale_y
        pts.append([round(nx, 4), round(ny, 4)])

    total_pts += len(pts)
    strokes.append({
        'cat': cat,
        'order': float(order),
        'cx': float(cx / w),
        'cy': float(cy / h),
        'area': float(area),
        'pts': pts
    })

strokes.sort(key=lambda s: s['order'])
print(f"Total strokes: {len(strokes)}, Total stroke points: {total_pts}")

# 2. Extract filled silhouette points (interior of Durga and Lion)
# On our binary art:
filled_pts = np.argwhere(img > 0)
np.random.seed(108)

# Sample 14,000 silhouette interior points
N_SIL = 15000
idx_sil = np.random.choice(len(filled_pts), size=min(N_SIL, len(filled_pts)), replace=False)
pts_sil = filled_pts[idx_sil]

# Also sample circular wall of flames points
# Centered around (0.5, 0.53) with radius 0.22 to 0.44
N_FIRE = 30000
fire_records = []
for _ in range(N_FIRE):
    angle = np.random.uniform(0, 2 * np.pi)
    # Circular mandala with flame tongues
    r_base = np.random.uniform(0.18, 0.42)
    # Add noise / flame tongue shape
    flame_noise = np.sin(angle * 7.0) * 0.03 + np.sin(angle * 13.0) * 0.02
    r_val = r_base + flame_noise
    fx = 0.5 + np.cos(angle) * r_val * (9.0 / 16.0)
    fy = 0.52 + np.sin(angle) * r_val

    # Color: golden yellow, incandescent amber, deep fiery orange
    # Inner fire is hotter
    if r_val < 0.28:
        # hot yellow / gold
        r = int(np.random.uniform(240, 255))
        g = int(np.random.uniform(180, 235))
        b = int(np.random.uniform(40, 90))
        size = int(np.random.uniform(180, 255))
    else:
        # fiery orange / amber / red
        r = int(np.random.uniform(230, 255))
        g = int(np.random.uniform(80, 160))
        b = int(np.random.uniform(10, 40))
        size = int(np.random.uniform(140, 220))

    nx = int(np.clip(fx, 0.0, 1.0) * 65535)
    ny = int(np.clip(fy, 0.0, 1.0) * 65535)
    phase = int(np.random.randint(0, 256))
    fire_records.append((nx, ny, r, g, b, 2, size, phase))

# Convert silhouette points to normalized coordinates
sil_records = []
target_scale_x = 0.84
aspect_ratio_art = h / w
target_scale_y = target_scale_x * aspect_ratio_art * (9.0 / 16.0)
offset_x = (1.0 - target_scale_x) / 2.0
offset_y = 0.34

for sy, sx in pts_sil:
    fx = offset_x + (float(sx) / (w - 1)) * target_scale_x
    fy = offset_y + (float(sy) / (h - 1)) * target_scale_y
    nx = int(np.clip(fx, 0.0, 1.0) * 65535)
    ny = int(np.clip(fy, 0.0, 1.0) * 65535)
    # Deep dark bronze / black shadow with warm undertones
    r = int(np.random.uniform(10, 35))
    g = int(np.random.uniform(4, 18))
    b = int(np.random.uniform(2, 12))
    size = int(np.random.uniform(160, 240))
    phase = int(np.random.randint(0, 256))
    sil_records.append((nx, ny, r, g, b, 0, size, phase))

# Edge rim points along all strokes
rim_records = []
for s in strokes:
    for px, py in s['pts']:
        nx = int(np.clip(px, 0.0, 1.0) * 65535)
        ny = int(np.clip(py, 0.0, 1.0) * 65535)
        # Molten gold
        r = int(np.random.uniform(245, 255))
        g = int(np.random.uniform(195, 230))
        b = int(np.random.uniform(60, 110))
        size = int(np.random.uniform(180, 255))
        phase = int(np.random.randint(0, 256))
        rim_records.append((nx, ny, r, g, b, 1, size, phase))

all_particles = fire_records + sil_records + rim_records
print(f"Particles: Fire={len(fire_records)}, Sil={len(sil_records)}, Rim={len(rim_records)}, Total={len(all_particles)}")

# Pack particles into binary buffer
byte_arr = bytearray()
for nx, ny, r, g, b, ptype, size, phase in all_particles:
    byte_arr.extend(struct.pack('<HHBBBBBB', nx, ny, r, g, b, ptype, size, phase))

b64_particles = base64.b64encode(byte_arr).decode('ascii')

# Save dataset
dataset = {
    'strokes': strokes,
    'totalParticles': len(all_particles),
    'fireCount': len(fire_records),
    'silCount': len(sil_records),
    'rimCount': len(rim_records),
    'base64Particles': b64_particles
}

with open('drawing_data.json', 'w', encoding='utf-8') as f:
    json.dump(dataset, f)

# Also create drawing_data.js for instant browser execution without fetch CORS issues
with open('drawing_data.js', 'w', encoding='utf-8') as f:
    f.write("window.DURGA_DRAWING_DATA = " + json.dumps(dataset) + ";\n")

print("Successfully written drawing_data.js and drawing_data.json!")
