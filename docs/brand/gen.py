import math, pathlib
out = pathlib.Path(__file__).parent

def rr(x, y, w, h, r):
    return (f"M{x+r} {y}H{x+w-r}A{r} {r} 0 0 1 {x+w} {y+r}V{y+h-r}A{r} {r} 0 0 1 {x+w-r} {y+h}"
            f"H{x+r}A{r} {r} 0 0 1 {x} {y+h-r}V{y+r}A{r} {r} 0 0 1 {x+r} {y}Z")

def circ(cx, cy, r):
    return f"M{cx-r} {cy}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0Z"

def bar(x1, y1, x2, y2, w):
    a = math.atan2(y2-y1, x2-x1); dx, dy = -math.sin(a)*w/2, math.cos(a)*w/2
    p = [(x1+dx, y1+dy), (x2+dx, y2+dy), (x2-dx, y2-dy), (x1-dx, y1-dy)]
    return "M" + "L".join(f"{px:.2f} {py:.2f}" for px, py in p) + "Z"

def svg(body, w=256):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 256">{body}</svg>\n'

def lockup(sym):
    return svg(f'<g>{sym}</g><text x="276" y="160" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="76" letter-spacing="-3">MilkGraph</text>', 760)

# A. Moo-node: kepala sapi, tanduk pendek berujung node graph
ear = "M70 98C48 84 22 88 14 104C30 124 58 126 76 116Z"
ear_r = "M186 98C208 84 234 88 242 104C226 124 198 126 180 116Z"
a = (f'<path fill-rule="evenodd" d="{rr(64,70,128,148,56)}{circ(104,124,11)}{circ(152,124,11)}{rr(80,158,96,52,26)}"/>'
     f'<path d="{rr(88,166,80,36,18)}"/>'
     f'<path fill="#fff" d="{circ(108,184,9)}{circ(148,184,9)}{bar(108,184,148,184,6)}"/>'
     f'<path d="{ear}{ear_r}"/>'
     '<path d="M84 84C64 76 52 56 56 30C70 46 84 54 100 74Z"/>'
     '<path d="M172 84C192 76 204 56 200 30C186 46 172 54 156 74Z"/>')
# B. Drop-node: graph segitiga, node puncaknya tetes susu
drop = "M128 20C128 20 84 74 84 106A44 44 0 0 0 172 106C172 74 128 20 128 20Z"
b = (f'<path d="{drop}"/>'
     f'<path d="{bar(108,130,62,198,16)}{bar(148,130,194,198,16)}{bar(62,198,194,198,16)}{circ(62,198,30)}{circ(194,198,30)}"/>')
# C. Carton-M: dua atap karton membentuk huruf M, puncak dihubungkan garis graph
c = ('<path d="M36 224V112L84 64L128 112L172 64L220 112V224H176V150L128 198L80 150V224Z"/>'
     f'<path d="{bar(84,40,172,40,10)}{circ(84,40,16)}{circ(172,40,16)}"/>')

for name, sym in [("a-moo-node", a), ("b-drop-node", b), ("c-spot-carton", c)]:
    (out / f"{name}.svg").write_text(svg(sym))
    (out / f"{name}-lockup.svg").write_text(lockup(sym))
