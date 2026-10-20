"""Blur private customer data in the combo landing-page screenshots.

Coordinates refer to a 1400px-wide preview and scale to each source image.
Run only against original images; repeated runs compound the blur.
"""
from pathlib import Path
from PIL import Image, ImageFilter

REGIONS = {
    'calculadora5': [(116, 298, 320, 342), (134, 453, 354, 498), (114, 611, 330, 657)],
    'calculadora9': [(58, y, 286, y + 42) for y in (44, 172, 300, 428, 556, 684)],
    'calculadora10': [(39, 30, 238, 71), (55, 300, 245, 333)],
    'calculadora11': [(258, 54, 470, 99), (168, 150, 391, 198)],
    'depoimentocalculadora1': [(43, 50, 390, 92)],
    'depoimentocalculadora2': [(17, 10, 365, 53)],
}

root = Path(__file__).resolve().parents[1] / 'public'
for stem, boxes in REGIONS.items():
    for path in (root / f'{stem}.png', root / 'combo-precificacao' / f'{stem}.jpg'):
        with Image.open(path) as source:
            image = source.convert('RGB')
        scale = image.width / 1400
        for coords in boxes:
            box = tuple(round(v * scale) for v in coords)
            region = image.crop(box)
            # Coarse sampling plus heavy blur removes character shapes.
            region = region.resize((2, 1), Image.Resampling.BOX).resize(region.size, Image.Resampling.BICUBIC)
            region = region.filter(ImageFilter.GaussianBlur(18 * scale))
            image.paste(region, box)
        if path.suffix == '.jpg':
            image.save(path, quality=90, optimize=True)
        else:
            image.save(path, optimize=True)
        print(f'Redacted {path.relative_to(root)}')
