import math, pathlib
out = pathlib.Path(__file__).parent / "v2"
out.mkdir(exist_ok=True)

def circ(cx, cy, r):
    return f"M{cx-r} {cy}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0Z"

def svg(body, w=256):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 256">{body}</svg>\n'

def lockup(sym):
    return svg(f'<g>{sym}</g><text x="276" y="160" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="76" letter-spacing="-3">MilkGraph</text>', 760)

# A. m-node: huruf m dua lengkung, kaki kiri lepas jadi node
a = ('<g transform="translate(0 -12)">'
     '<path d="M44 128A56 56 0 0 1 156 128V208H116V128A16 16 0 0 0 84 128H44Z"/>'
     '<path d="M116 208V128A56 56 0 0 1 228 128V208H188V128A16 16 0 0 0 156 128V208Z"/>'
     f'<path d="{circ(64,188,20)}"/></g>')

# B. G-node: cincin G, palangnya edge yang berakhir di node pusat
def pt(r, deg):
    t = math.radians(deg); return f"{128+r*math.cos(t):.2f} {128+r*math.sin(t):.2f}"
b = (f'<path d="M{pt(92,-40)}A92 92 0 1 0 220 128L178 128A50 50 0 1 1 {pt(50,-40)}Z"/>'
     '<path d="M128 108H220V148H128Z"/>'
     f'<path d="{circ(128,128,28)}"/>')

# C. Block-M: blok dengan takik V 60 derajat membentuk M, node duduk di takik
c = ('<path d="M24 64H72L108 126.35L144 64H192V208H24Z"/>'
     f'<path d="{circ(220,190,18)}"/>')

for name, sym in [("a-m-node", a), ("b-g-node", b), ("c-block-m", c)]:
    (out / f"{name}.svg").write_text(svg(sym))
    (out / f"{name}-lockup.svg").write_text(lockup(sym))
