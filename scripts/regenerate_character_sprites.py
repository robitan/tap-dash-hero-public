#!/usr/bin/env python3
"""
Tap Dash Hero - キャラクタースプライト生成スクリプト

宇宙テーマに合わせたピクセルアート風キャラクターを生成する。
出力: 1024x1024 RGBA PNG（透過背景）

対象:
  - player.png        : スペースヒーロー（青い宇宙服の猫型ロボ）
  - enemy-basic.png   : 小型エイリアン（緑のスライム型）
  - enemy-armored.png : 重装甲ロボット（灰色の堅牢な機体）
  - enemy-explosive.png: 爆発エイリアン（オレンジの炎を纏った球体）
  - enemy-boss.png    : ボスエイリアン（紫の大型モンスター）
"""

from PIL import Image, ImageDraw
import math
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'images')
CANVAS_SIZE = 64  # 内部描画サイズ
OUTPUT_SIZE = 1024  # 最終出力サイズ
PIXEL_SIZE = OUTPUT_SIZE // CANVAS_SIZE  # 1ピクセルあたりのスケール


def create_canvas():
    """透過背景のキャンバスを作成"""
    return Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))


def scale_up(img):
    """ピクセルアート風にニアレストネイバーで拡大"""
    return img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.NEAREST)


def draw_pixel(draw, x, y, color):
    """1ピクセルを描画"""
    if 0 <= x < CANVAS_SIZE and 0 <= y < CANVAS_SIZE:
        draw.point((x, y), fill=color)


def draw_rect(draw, x, y, w, h, color):
    """矩形を描画"""
    for dy in range(h):
        for dx in range(w):
            draw_pixel(draw, x + dx, y + dy, color)


def draw_circle_filled(draw, cx, cy, r, color):
    """塗りつぶし円を描画"""
    for y in range(-r, r + 1):
        for x in range(-r, r + 1):
            if x * x + y * y <= r * r:
                draw_pixel(draw, cx + x, cy + y, color)


def draw_circle_outline(draw, cx, cy, r, color):
    """円の輪郭を描画"""
    for angle in range(360):
        rad = math.radians(angle)
        x = round(cx + r * math.cos(rad))
        y = round(cy + r * math.sin(rad))
        draw_pixel(draw, x, y, color)


def draw_ellipse_filled(draw, cx, cy, rx, ry, color):
    """塗りつぶし楕円を描画"""
    for y in range(-ry, ry + 1):
        for x in range(-rx, rx + 1):
            if (x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01) <= 1:
                draw_pixel(draw, cx + x, cy + y, color)


# ============================================================
# Player: スペースヒーロー
# 青い宇宙服を着た猫型ヒーロー。丸い頭、尖った耳、バイザー付き。
# ============================================================
def generate_player():
    img = create_canvas()
    draw = ImageDraw.Draw(img)

    # 色定義
    body_main = (60, 140, 220, 255)       # 青い宇宙服
    body_light = (100, 175, 240, 255)     # ハイライト
    body_dark = (40, 95, 160, 255)        # シャドウ
    visor = (180, 230, 255, 255)          # バイザー（水色）
    visor_shine = (220, 245, 255, 255)    # バイザー光沢
    outline = (25, 50, 90, 255)           # アウトライン
    ear_inner = (100, 170, 235, 255)
    belt = (240, 200, 60, 255)            # ベルト（金色）
    boot = (40, 80, 140, 255)             # ブーツ
    jet_flame = (255, 160, 40, 255)       # ジェット炎
    jet_flame2 = (255, 220, 80, 255)

    cx, cy = 32, 30

    # ジェットパック炎（背面）
    draw_rect(draw, 24, 48, 3, 6, jet_flame)
    draw_rect(draw, 37, 48, 3, 6, jet_flame)
    draw_rect(draw, 25, 52, 1, 4, jet_flame2)
    draw_rect(draw, 38, 52, 1, 4, jet_flame2)

    # 体（宇宙服）
    draw_ellipse_filled(draw, cx, cy + 12, 10, 12, body_main)
    # 体のハイライト
    draw_ellipse_filled(draw, cx - 3, cy + 10, 4, 8, body_light)
    # 体のシャドウ
    draw_ellipse_filled(draw, cx + 5, cy + 14, 3, 6, body_dark)

    # ベルト
    draw_rect(draw, cx - 10, cy + 16, 20, 3, belt)
    draw_rect(draw, cx - 2, cy + 15, 4, 5, belt)  # バックル

    # 頭（丸いヘルメット）
    draw_circle_filled(draw, cx, cy - 2, 13, body_main)
    draw_circle_filled(draw, cx, cy - 2, 11, body_light)

    # 耳（猫耳ヘルメット）
    for dx in [-8, 8]:
        ear_x = cx + dx
        ear_y = cy - 14
        # 外側
        for i in range(6):
            draw_rect(draw, ear_x - (1 if dx < 0 else -1), ear_y - i, 1 + abs(dx) // 8, 1, outline)
            draw_pixel(draw, ear_x + (1 if dx > 0 else -1) * (i // 2), ear_y - i, body_main)
        # 三角形の耳
        sign = 1 if dx > 0 else -1
        points = [(ear_x, ear_y - 7), (ear_x + sign * 5, ear_y + 1), (ear_x - sign * 1, ear_y + 1)]
        # 手動で三角を描画
        for row in range(8):
            yy = ear_y - 7 + row
            half_w = row * 3 // 7
            for col in range(-half_w, half_w + 1):
                draw_pixel(draw, ear_x + col + sign, yy, body_main)
                if abs(col) < half_w:
                    draw_pixel(draw, ear_x + col + sign, yy, ear_inner)

    # バイザー（顔面）
    draw_ellipse_filled(draw, cx, cy - 1, 8, 7, visor)
    draw_ellipse_filled(draw, cx - 2, cy - 3, 3, 3, visor_shine)

    # 目（バイザー内）
    draw_rect(draw, cx - 5, cy - 2, 3, 3, outline)
    draw_rect(draw, cx + 2, cy - 2, 3, 3, outline)
    draw_pixel(draw, cx - 4, cy - 2, (255, 255, 255, 255))
    draw_pixel(draw, cx + 3, cy - 2, (255, 255, 255, 255))

    # 口
    draw_rect(draw, cx - 2, cy + 3, 4, 1, (40, 70, 120, 255))

    # 腕
    draw_rect(draw, cx - 14, cy + 8, 4, 10, body_main)
    draw_rect(draw, cx + 10, cy + 8, 4, 10, body_main)
    # 手袋
    draw_rect(draw, cx - 15, cy + 16, 5, 4, body_light)
    draw_rect(draw, cx + 10, cy + 16, 5, 4, body_light)

    # 脚
    draw_rect(draw, cx - 7, cy + 23, 5, 8, body_main)
    draw_rect(draw, cx + 2, cy + 23, 5, 8, body_main)
    # ブーツ
    draw_rect(draw, cx - 8, cy + 29, 7, 5, boot)
    draw_rect(draw, cx + 1, cy + 29, 7, 5, boot)

    # アウトライン（頭）
    draw_circle_outline(draw, cx, cy - 2, 13, outline)

    # アンテナ
    draw_rect(draw, cx, cy - 19, 1, 5, belt)
    draw_circle_filled(draw, cx, cy - 20, 2, (255, 80, 80, 255))

    return scale_up(img)


# ============================================================
# Enemy Basic: 小型エイリアン
# 緑色のスライム型。シンプルで丸い体に触角。
# ============================================================
def generate_enemy_basic():
    img = create_canvas()
    draw = ImageDraw.Draw(img)

    body = (80, 200, 80, 255)
    body_light = (120, 230, 100, 255)
    body_dark = (50, 150, 50, 255)
    outline = (30, 80, 30, 255)
    eye_white = (255, 255, 255, 255)
    eye_red = (220, 40, 40, 255)
    antenna = (60, 180, 60, 255)
    antenna_tip = (255, 255, 80, 255)

    cx, cy = 32, 34

    # 触角
    for dx in [-7, 7]:
        sign = 1 if dx > 0 else -1
        for i in range(10):
            ax = cx + dx + sign * (i // 3)
            ay = cy - 14 - i
            draw_pixel(draw, ax, ay, antenna)
        draw_circle_filled(draw, cx + dx + sign * 3, cy - 24, 2, antenna_tip)

    # 体（スライム型 - 下が広い楕円）
    draw_ellipse_filled(draw, cx, cy, 16, 14, body)
    # 底部を広げる
    draw_ellipse_filled(draw, cx, cy + 8, 18, 8, body)
    # ハイライト
    draw_ellipse_filled(draw, cx - 4, cy - 4, 6, 5, body_light)
    # シャドウ
    draw_ellipse_filled(draw, cx + 6, cy + 4, 5, 6, body_dark)

    # 目（大きくて赤い）
    draw_circle_filled(draw, cx - 6, cy - 2, 5, eye_white)
    draw_circle_filled(draw, cx + 6, cy - 2, 5, eye_white)
    draw_circle_filled(draw, cx - 5, cy - 2, 3, eye_red)
    draw_circle_filled(draw, cx + 7, cy - 2, 3, eye_red)
    # 瞳光
    draw_pixel(draw, cx - 6, cy - 3, eye_white)
    draw_pixel(draw, cx + 6, cy - 3, eye_white)

    # 口（ニヤリ）
    for i in range(8):
        mx = cx - 4 + i
        my = cy + 5 + (1 if i < 2 or i > 5 else 0)
        draw_pixel(draw, mx, my, outline)
    # 牙
    draw_pixel(draw, cx - 3, cy + 5, eye_white)
    draw_pixel(draw, cx + 3, cy + 5, eye_white)

    # アウトライン
    draw_circle_outline(draw, cx, cy, 16, outline)
    draw_ellipse_filled(draw, cx, cy + 16, 18, 2, outline)  # 底部影

    return scale_up(img)


# ============================================================
# Enemy Armored: 重装甲ロボット
# 灰色の堅牢な機体。角ばった形状、赤いモノアイ。
# ============================================================
def generate_enemy_armored():
    img = create_canvas()
    draw = ImageDraw.Draw(img)

    armor = (100, 105, 115, 255)
    armor_light = (150, 155, 165, 255)
    armor_dark = (60, 65, 75, 255)
    outline = (30, 35, 45, 255)
    eye_red = (255, 40, 40, 255)
    eye_glow = (255, 120, 120, 255)
    accent = (80, 90, 100, 255)
    rivet = (170, 175, 185, 255)

    cx, cy = 32, 32

    # 体（角ばった長方形ベース）
    draw_rect(draw, cx - 14, cy - 10, 28, 24, armor)
    # 上部装甲（肩パーツ）
    draw_rect(draw, cx - 18, cy - 8, 36, 8, armor_dark)
    # ハイライト
    draw_rect(draw, cx - 12, cy - 8, 8, 6, armor_light)

    # 頭部（小さい四角）
    draw_rect(draw, cx - 8, cy - 18, 16, 10, armor)
    draw_rect(draw, cx - 6, cy - 16, 12, 6, armor_dark)

    # モノアイ（赤いスリット）
    draw_rect(draw, cx - 5, cy - 14, 10, 3, (20, 20, 25, 255))
    draw_rect(draw, cx - 3, cy - 13, 6, 1, eye_red)
    draw_pixel(draw, cx - 1, cy - 14, eye_glow)
    draw_pixel(draw, cx, cy - 14, eye_glow)

    # 胸部装甲プレート
    draw_rect(draw, cx - 6, cy - 2, 12, 8, accent)
    draw_rect(draw, cx - 4, cy, 8, 4, armor_dark)
    # リベット
    for dx in [-10, -6, 6, 10]:
        for dy in [-4, 4, 10]:
            draw_pixel(draw, cx + dx, cy + dy, rivet)

    # 腕（重装甲）
    draw_rect(draw, cx - 20, cy - 4, 6, 16, armor)
    draw_rect(draw, cx + 14, cy - 4, 6, 16, armor)
    # 拳
    draw_rect(draw, cx - 21, cy + 10, 8, 6, armor_dark)
    draw_rect(draw, cx + 13, cy + 10, 8, 6, armor_dark)

    # 脚
    draw_rect(draw, cx - 10, cy + 14, 7, 10, armor)
    draw_rect(draw, cx + 3, cy + 14, 7, 10, armor)
    # 足
    draw_rect(draw, cx - 12, cy + 22, 10, 5, armor_dark)
    draw_rect(draw, cx + 2, cy + 22, 10, 5, armor_dark)

    # 肩のトゲ
    for dx in [-18, 18]:
        sign = 1 if dx > 0 else -1
        for i in range(5):
            draw_pixel(draw, cx + dx + sign * i, cy - 8 - i, armor_dark)
            draw_pixel(draw, cx + dx + sign * i, cy - 7 - i, armor)

    # アウトライン
    # 上部
    draw_rect(draw, cx - 8, cy - 19, 16, 1, outline)
    draw_rect(draw, cx - 14, cy - 11, 28, 1, outline)
    # 側面
    for y in range(cy - 18, cy + 27):
        if cy - 18 <= y < cy - 10:
            draw_pixel(draw, cx - 9, y, outline)
            draw_pixel(draw, cx + 8, y, outline)

    return scale_up(img)


# ============================================================
# Enemy Explosive: 爆発エイリアン
# オレンジの球体に炎のオーラ。導火線付き。怒り顔。
# ============================================================
def generate_enemy_explosive():
    img = create_canvas()
    draw = ImageDraw.Draw(img)

    body = (240, 140, 40, 255)
    body_light = (255, 190, 80, 255)
    body_dark = (200, 100, 20, 255)
    outline = (120, 60, 10, 255)
    eye_white = (255, 255, 255, 255)
    pupil = (40, 20, 10, 255)
    fuse = (80, 60, 40, 255)
    spark1 = (255, 255, 100, 255)
    spark2 = (255, 200, 50, 255)
    flame = (255, 80, 20, 255)
    flame_light = (255, 180, 50, 255)
    mouth = (160, 60, 20, 255)

    cx, cy = 32, 34

    # 炎のオーラ（背面）
    for angle_deg in range(0, 360, 25):
        rad = math.radians(angle_deg)
        dist = 16 + (angle_deg % 50) // 10 * 2
        fx = cx + int(math.cos(rad) * dist)
        fy = cy + int(math.sin(rad) * dist)
        r = 3 + (angle_deg % 30) // 10
        draw_circle_filled(draw, fx, fy, r, flame if angle_deg % 2 == 0 else flame_light)

    # 体（球体）
    draw_circle_filled(draw, cx, cy, 14, body)
    # ハイライト
    draw_circle_filled(draw, cx - 4, cy - 5, 6, body_light)
    draw_circle_filled(draw, cx - 6, cy - 7, 3, (255, 220, 140, 255))
    # シャドウ
    draw_circle_filled(draw, cx + 4, cy + 5, 6, body_dark)

    # 導火線
    for i in range(8):
        fx = cx + 2 + i
        fy = cy - 14 - i + (i % 2)
        draw_pixel(draw, fx, fy, fuse)
        draw_pixel(draw, fx + 1, fy, fuse)

    # 火花
    spark_cx = cx + 10
    spark_cy = cy - 22
    for angle_deg in range(0, 360, 45):
        rad = math.radians(angle_deg)
        for d in range(1, 4):
            sx = spark_cx + int(math.cos(rad) * d)
            sy = spark_cy + int(math.sin(rad) * d)
            draw_pixel(draw, sx, sy, spark1 if d < 3 else spark2)
    draw_circle_filled(draw, spark_cx, spark_cy, 2, spark1)

    # 怒り目
    draw_circle_filled(draw, cx - 5, cy - 3, 4, eye_white)
    draw_circle_filled(draw, cx + 5, cy - 3, 4, eye_white)
    draw_circle_filled(draw, cx - 4, cy - 2, 2, pupil)
    draw_circle_filled(draw, cx + 6, cy - 2, 2, pupil)
    # 瞳光
    draw_pixel(draw, cx - 5, cy - 4, eye_white)
    draw_pixel(draw, cx + 5, cy - 4, eye_white)
    # 怒り眉
    for i in range(5):
        draw_pixel(draw, cx - 7 + i, cy - 7 + (i // 2), outline)
        draw_pixel(draw, cx + 3 + i, cy - 5 - (i // 2), outline)

    # 口（怒りの口）
    draw_rect(draw, cx - 4, cy + 5, 8, 4, mouth)
    draw_rect(draw, cx - 3, cy + 5, 6, 1, pupil)
    # 牙
    draw_pixel(draw, cx - 2, cy + 6, eye_white)
    draw_pixel(draw, cx + 2, cy + 6, eye_white)
    draw_pixel(draw, cx - 2, cy + 7, eye_white)
    draw_pixel(draw, cx + 2, cy + 7, eye_white)

    # アウトライン
    draw_circle_outline(draw, cx, cy, 14, outline)

    return scale_up(img)


# ============================================================
# Enemy Boss: ボスエイリアン
# 紫の大型モンスター。角付き、複数の目、威圧的。
# ============================================================
def generate_enemy_boss():
    img = create_canvas()
    draw = ImageDraw.Draw(img)

    body = (100, 50, 150, 255)
    body_light = (140, 80, 190, 255)
    body_dark = (60, 30, 100, 255)
    outline = (30, 15, 50, 255)
    eye_yellow = (255, 240, 60, 255)
    eye_red = (220, 30, 30, 255)
    horn = (180, 160, 60, 255)
    horn_dark = (140, 120, 40, 255)
    teeth = (230, 230, 230, 255)
    mouth_inside = (80, 20, 40, 255)
    gem = (0, 220, 180, 255)
    gem_light = (100, 255, 220, 255)

    cx, cy = 32, 30

    # 角（左右）
    for dx in [-12, 12]:
        sign = 1 if dx > 0 else -1
        for i in range(10):
            hx = cx + dx + sign * (i * 2 // 3)
            hy = cy - 16 - i
            w = max(1, 4 - i // 3)
            draw_rect(draw, hx - w // 2, hy, w, 2, horn if i < 7 else horn_dark)

    # 体（大きな楕円）
    draw_ellipse_filled(draw, cx, cy + 6, 20, 18, body)
    # ハイライト
    draw_ellipse_filled(draw, cx - 6, cy, 6, 8, body_light)
    # シャドウ
    draw_ellipse_filled(draw, cx + 8, cy + 10, 6, 8, body_dark)

    # 頭部（上部）
    draw_circle_filled(draw, cx, cy - 6, 16, body)
    draw_circle_filled(draw, cx - 4, cy - 10, 6, body_light)

    # 額の宝石
    draw_circle_filled(draw, cx, cy - 14, 3, gem)
    draw_pixel(draw, cx - 1, cy - 15, gem_light)
    draw_pixel(draw, cx, cy - 15, gem_light)

    # 目（3つ - 中央大、左右小）
    # 左目
    draw_circle_filled(draw, cx - 8, cy - 4, 4, eye_yellow)
    draw_circle_filled(draw, cx - 7, cy - 4, 2, eye_red)
    draw_pixel(draw, cx - 9, cy - 5, (255, 255, 200, 255))
    # 右目
    draw_circle_filled(draw, cx + 8, cy - 4, 4, eye_yellow)
    draw_circle_filled(draw, cx + 9, cy - 4, 2, eye_red)
    draw_pixel(draw, cx + 7, cy - 5, (255, 255, 200, 255))
    # 中央の第三の目
    draw_circle_filled(draw, cx, cy - 8, 3, eye_yellow)
    draw_circle_filled(draw, cx + 1, cy - 8, 1, eye_red)

    # 口（大きく開いた口）
    draw_ellipse_filled(draw, cx, cy + 6, 10, 5, mouth_inside)
    # 上の歯
    for i in range(5):
        tx = cx - 8 + i * 4
        draw_rect(draw, tx, cy + 2, 3, 3, teeth)
    # 下の歯
    for i in range(4):
        tx = cx - 6 + i * 4
        draw_rect(draw, tx, cy + 8, 3, 3, teeth)

    # 腕（太い）
    draw_rect(draw, cx - 24, cy + 2, 6, 14, body)
    draw_rect(draw, cx + 18, cy + 2, 6, 14, body)
    # 爪
    for i in range(3):
        draw_rect(draw, cx - 26 + i * 2, cy + 14 + i, 2, 4, horn)
        draw_rect(draw, cx + 18 + i * 2, cy + 14 + i, 2, 4, horn)

    # 脚
    draw_rect(draw, cx - 12, cy + 20, 8, 8, body_dark)
    draw_rect(draw, cx + 4, cy + 20, 8, 8, body_dark)
    # 足爪
    for i in range(3):
        draw_rect(draw, cx - 13 + i * 3, cy + 26, 2, 3, horn)
        draw_rect(draw, cx + 3 + i * 3, cy + 26, 2, 3, horn)

    # 肩のトゲ
    for dx in [-20, 20]:
        sign = 1 if dx > 0 else -1
        for i in range(4):
            draw_pixel(draw, cx + dx + sign * i, cy - i, body_dark)
            draw_pixel(draw, cx + dx + sign * i, cy - i - 1, body)

    # アウトライン
    draw_circle_outline(draw, cx, cy - 6, 16, outline)

    return scale_up(img)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    sprites = {
        'player.png': generate_player,
        'enemy-basic.png': generate_enemy_basic,
        'enemy-armored.png': generate_enemy_armored,
        'enemy-explosive.png': generate_enemy_explosive,
        'enemy-boss.png': generate_enemy_boss,
    }

    for filename, generator in sprites.items():
        path = os.path.join(OUTPUT_DIR, filename)
        img = generator()
        img.save(path)
        print(f'Generated: {path}')

    print(f'\nAll {len(sprites)} sprites generated successfully!')


if __name__ == '__main__':
    main()
