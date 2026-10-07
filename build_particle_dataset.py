import cv2
import numpy as np
import base64
import struct

# Load image
img = cv2.imread('durga_ref.jpg')
h, w = img.shape[:2]
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

print(f"Processing image {w}x{h}...")

# 1. Edge detection for rim highlights
edges = cv2.Canny(gray, 20, 90)
gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
mag = cv2.magnitude(gx, gy)
mag_norm = cv2.normalize(mag, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
edge_mask = (edges > 0) | (mag_norm > 40)

# 2. Fire mask
# Raging wall of fire has warm hue and luminance
r_chan = rgb[:, :, 0]
g_chan = rgb[:, :, 1]
b_chan = rgb[:, :, 2]
fire_mask = (gray > 32) & ((r_chan > 50) | (g_chan > 20))

# 3. Durga & Lion silhouette region
durga_box = np.zeros((h, w), dtype=bool)
durga_box[320:965, 30:565] = True
pedestal_mask = np.zeros((h, w), dtype=bool)
pedestal_mask[910:1024, :] = (gray[910:1024, :] < 55)

# Silhouette mask
silhouette_mask = ((durga_box & (gray < 85)) | pedestal_mask) & (~fire_mask | (gray < 45))

# Rim on silhouette boundary
kernel = np.ones((5, 5), np.uint8)
sil_dilated = cv2.dilate(silhouette_mask.astype(np.uint8), kernel)
rim_mask = (sil_dilated > 0) & edge_mask & (gray > 15)

# Candidate points
rim_pts = np.argwhere(rim_mask)
sil_pts = np.argwhere(silhouette_mask & ~rim_mask)
fire_pts = np.argwhere(fire_mask & ~rim_mask)

print(f"Rim candidates: {len(rim_pts)}, Sil candidates: {len(sil_pts)}, Fire candidates: {len(fire_pts)}")

# Target particle counts for high density (Total ~60,000)
N_FIRE = 32000
N_SIL = 16000
N_RIM = 14000

np.random.seed(108)

# 1. Sample Fire (weighted by luminance to capture both hot center and licking flames)
fire_weights = (gray[fire_pts[:, 0], fire_pts[:, 1]].astype(float) ** 1.1) + 2.0
fire_weights /= fire_weights.sum()
idx_fire = np.random.choice(len(fire_pts), size=min(N_FIRE, len(fire_pts)), replace=False, p=fire_weights)
pts_fire = fire_pts[idx_fire]

# 2. Sample Silhouette (dense coverage of Durga Maa, weapons, lion, pedestal)
sil_weights = (gray[sil_pts[:, 0], sil_pts[:, 1]].astype(float) + 5.0)
sil_weights /= sil_weights.sum()
idx_sil = np.random.choice(len(sil_pts), size=min(N_SIL, len(sil_pts)), replace=False, p=sil_weights)
pts_sil = sil_pts[idx_sil]

# 3. Sample Rim (dense golden edge particles tracing every weapon prong, finger, crown, lion)
idx_rim = np.random.choice(len(rim_pts), size=min(N_RIM, len(rim_pts)), replace=False)
pts_rim = rim_pts[idx_rim]

fire_records = []
sil_records = []
rim_records = []

# Process Fire points (type = 2)
for y, x in pts_fire:
    nx = int((x / (w - 1)) * 65535)
    ny = int((y / (h - 1)) * 65535)
    orig = rgb[y, x].astype(float)
    lum = gray[y, x]

    # Enhance blazing fire colors: deep orange, golden yellow, warm amber
    if lum > 130:
        # Hot golden yellow / incandescent white-yellow
        r = int(np.clip(orig[0] * 1.15 + 20, 0, 255))
        g = int(np.clip(orig[1] * 1.1 + 10, 0, 255))
        b = int(np.clip(orig[2] * 0.9, 0, 255))
        size = int(np.random.uniform(180, 255))
    else:
        # Fiery deep orange and warm amber
        r = int(np.clip(orig[0] * 1.25 + 30, 0, 255))
        g = int(np.clip(orig[1] * 0.95 + 5, 0, 255))
        b = int(np.clip(orig[2] * 0.5, 0, 255))
        size = int(np.random.uniform(140, 220))

    ptype = 2
    phase = int(np.random.randint(0, 256))
    fire_records.append((nx, ny, r, g, b, ptype, size, phase))

# Process Silhouette points (type = 0)
for y, x in pts_sil:
    nx = int((x / (w - 1)) * 65535)
    ny = int((y / (h - 1)) * 65535)
    orig = rgb[y, x].astype(float)
    # Deep dark bronze and rich shadow black with subtle dark ruby highlights
    r = int(np.clip(orig[0] * 0.4 + 8, 4, 45))
    g = int(np.clip(orig[1] * 0.3 + 3, 2, 25))
    b = int(np.clip(orig[2] * 0.2 + 2, 2, 18))
    ptype = 0
    size = int(np.random.uniform(160, 240))
    phase = int(np.random.randint(0, 256))
    sil_records.append((nx, ny, r, g, b, ptype, size, phase))

# Process Rim points (type = 1)
for y, x in pts_rim:
    nx = int((x / (w - 1)) * 65535)
    ny = int((y / (h - 1)) * 65535)
    # Brilliant incandescent gold rim highlight
    r = int(np.random.uniform(240, 255))
    g = int(np.random.uniform(190, 230))
    b = int(np.random.uniform(50, 100))
    ptype = 1
    size = int(np.random.uniform(170, 255))
    phase = int(np.random.randint(0, 256))
    rim_records.append((nx, ny, r, g, b, ptype, size, phase))

# Note: We keep each section contiguous in the binary buffer so WebGL can draw:
# 1. Fire: 0 to len(fire_records) [Additive blending]
# 2. Silhouette: len(fire_records) to len(fire_records) + len(sil_records) [Alpha occluding blending]
# 3. Rim: len(fire_records) + len(sil_records) to total [Additive blending]
# Within each category, shuffle so particles swirl into place organically
np.random.shuffle(fire_records)
np.random.shuffle(sil_records)
np.random.shuffle(rim_records)

all_records = fire_records + sil_records + rim_records

byte_arr = bytearray()
for nx, ny, r, g, b, ptype, size, phase in all_records:
    byte_arr.extend(struct.pack('<HHBBBBBB', nx, ny, r, g, b, ptype, size, phase))

b64_data = base64.b64encode(byte_arr).decode('ascii')

js_content = f"""// Auto-generated devotional particle dataset for Goddess Durga Maa
// Aspect ratio: {w}/{h} = {w/h:.6f}
window.DURGA_PARTICLE_CONFIG = {{
  totalCount: {len(all_records)},
  fireCount: {len(fire_records)},
  silCount: {len(sil_records)},
  rimCount: {len(rim_records)},
  aspectRatio: {w/h:.6f},
  base64Data: "{b64_data}"
}};
"""

with open('particles_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated {len(all_records)} particles: Fire={len(fire_records)}, Sil={len(sil_records)}, Rim={len(rim_records)}")
