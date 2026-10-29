"""Build MilkGraph logo masters: symbol, wordmark, lockups (colour + one-colour)."""
import pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = pathlib.Path(__file__).parent
FONT = pathlib.Path(__file__).parents[3] / ".next/static/media/8800dfc60902df36-s.p.2sla2yow9-9p_.woff2"
INK, GREEN, NODE, LIGHT = "#0F2A1D", "#00782A", "#008A30", "#92D1A0"


def circ(cx, cy, r):
    return f"M{cx-r} {cy}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0Z"


# Symbol on a 256 grid: m = two arches (outer r 56, inner r 16, stem 40), left foot detached as a node (r 20).
M_PATH = ("M44 116A56 56 0 0 1 156 116V196H116V116A16 16 0 0 0 84 116H44Z"
          "M116 196V116A56 56 0 0 1 228 116V196H188V116A16 16 0 0 0 156 116V196Z")
DOT = circ(64, 176, 20)
SYM_BOX = (44, 60, 184, 136)  # x, y, w, h of the drawn symbol


def symbol(m_fill, dot_fill):
    return f'<path fill="{m_fill}" d="{M_PATH}"/><path fill="{dot_fill}" d="{DOT}"/>'


def wordmark_path(text="MilkGraph", weight=700, tracking=-0.02):
    font = TTFont(FONT)
    font = instantiateVariableFont(font, {"wght": weight})
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    upm, cap = font["head"].unitsPerEm, font["OS/2"].sCapHeight
    pen = SVGPathPen(gs)
    x = 0
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        x += gs[g].width + tracking * upm
    return pen.getCommands(), x - tracking * upm, cap


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


def build():
    d, adv, cap = wordmark_path()
    sx, sy, sw, sh = SYM_BOX
    # Horizontal lockup: cap height = 56% of symbol height, optically centred, gap = node diameter (40)
    k = (sh * 0.56) / cap
    word_x, word_base = sx + sw + 40, sy + sh / 2 + cap * k / 2
    word = lambda fill: f'<path fill="{fill}" transform="translate({word_x} {word_base:.2f}) scale({k:.5f})" d="{d}"/>'
    hw = word_x + adv * k + 44
    # Stacked lockup: symbol centred above wordmark
    k2 = (sh * 0.42) / cap
    ww = adv * k2
    sw_total = max(256, ww + 88)
    off = (sw_total - 256) / 2
    st_word = lambda fill: (f'<path fill="{fill}" transform="translate({(sw_total-ww)/2:.2f} {sy+sh+40+cap*k2:.2f}) '
                            f'scale({k2:.5f})" d="{d}"/>')
    st_h = sy + sh + 40 + cap * k2 + 60

    variants = {"color": (INK, NODE, INK), "black": ("#000", "#000", "#000"), "white": ("#fff", "#fff", "#fff"),
                "green": (GREEN, GREEN, GREEN)}
    for name, (m, dot, w) in variants.items():
        (OUT / f"milkgraph-symbol-{name}.svg").write_text(svg(256, 256, symbol(m, dot), "MilkGraph"))
        (OUT / f"milkgraph-horizontal-{name}.svg").write_text(svg(hw, 256, symbol(m, dot) + word(w), "MilkGraph"))
        (OUT / f"milkgraph-stacked-{name}.svg").write_text(
            svg(sw_total, st_h, f'<g transform="translate({off:.2f} 0)">{symbol(m, dot)}</g>' + st_word(w), "MilkGraph"))
        (OUT / f"milkgraph-wordmark-{name}.svg").write_text(
            svg(adv * k + 16, cap * k + 16, f'<path fill="{w}" transform="translate(8 {cap*k+8:.2f}) scale({k:.5f})" d="{d}"/>', "MilkGraph"))
    # Reversed on dark: thinner feel comes from light node; app tile uses brand green
    (OUT / "milkgraph-horizontal-on-dark.svg").write_text(
        svg(hw, 256, f'<rect width="100%" height="100%" fill="{INK}"/>' + symbol("#fff", LIGHT) + word("#fff"), "MilkGraph"))
    (OUT / "milkgraph-app-tile.svg").write_text(
        svg(256, 256, f'<rect width="256" height="256" rx="56" fill="{GREEN}"/>'
                      f'<g transform="translate(128 128) scale(.78) translate(-136 -128)">{symbol("#fff", LIGHT)}</g>', "MilkGraph"))


build()
