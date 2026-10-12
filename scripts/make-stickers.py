from pathlib import Path
from PIL import Image, ImageDraw

target = Path(__file__).resolve().parents[1] / 'dist' / 'assets'
target.mkdir(parents=True, exist_ok=True)
heart = ['01100110','11111111','11111111','01111110','00111100','00011000']
for kind in ['sweet', 'funny', 'celebration']:
    frames = []
    for frame in range(4):
        image = Image.new('RGB', (48, 40), '#eee2d0')
        draw = ImageDraw.Draw(image)
        def pixelheart(x, y, color):
            for row, line in enumerate(heart):
                for col, cell in enumerate(line):
                    if cell == '1': draw.rectangle((x+col*2,y+row*2,x+col*2+1,y+row*2+1),fill=color)
        offset = [0,-1,-2,-1][frame]
        if kind == 'funny':
            draw.rectangle((13,10+offset,34,29+offset),fill='#aa91b7')
            draw.rectangle((17,8+offset,30,31+offset),fill='#aa91b7')
            draw.rectangle((18,17+offset,20,19+offset),fill='#3d314d')
            draw.rectangle((27,17+offset,29,19+offset),fill='#3d314d')
            draw.rectangle((15,22+offset,19,24+offset),fill='#eaa6ba')
            draw.rectangle((28,22+offset,32,24+offset),fill='#eaa6ba')
            draw.line((22,25+offset,25,25+offset),fill='#3d314d',width=2)
        elif kind == 'sweet': pixelheart(16,14+offset,'#d586a1')
        else:
            pixelheart(7,17+offset,'#d586a1'); pixelheart(26,12-offset,'#b69ac9')
            for x,y in [(8,7),(36,30),(24,5)]:
                draw.line((x-2,y,x+2,y),fill='#b69453'); draw.line((x,y-2,x,y+2),fill='#b69453')
        frames.append(image.resize((192,160),Image.Resampling.NEAREST))
    frames[0].save(target / f'{kind}.png')
    frames[0].save(target / f'{kind}.gif',save_all=True,append_images=frames[1:],duration=220,loop=0)
