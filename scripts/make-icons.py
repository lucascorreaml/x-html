from pathlib import Path
import math, struct, zlib
root=Path(__file__).resolve().parent.parent
for size in (16,32,48,128):
 scale=4;side=size*scale;rows=[]
 for y in range(side):
  row=bytearray()
  for x in range(side):
   px=(x+.5)*128/side;py=(y+.5)*128/side
   dx=max(36-px,0,px-92);dy=max(36-py,0,py-92)
   bg=16<=px<=112 and 16<=py<=112 and dx*dx+dy*dy<=400
   white=bg and ((60<=px<=68 and 35<=py<=71) or (52<=py<=77 and abs(px-64)<=77-py and py>=63) or (38<=px<=90 and 84<=py<=92) or (38<=px<=46 and 75<=py<=92) or (82<=px<=90 and 75<=py<=92))
   row.extend((255,255,255,255) if white else (23,101,209,255) if bg else (0,0,0,0))
  rows.append(row)
 data=bytearray()
 for y in range(size):
  data.append(0)
  for x in range(size):
   for c in range(4):data.append(round(sum(rows[y*scale+dy][(x*scale+dx)*4+c] for dy in range(scale) for dx in range(scale))/(scale*scale)))
 def chunk(tag,body):return struct.pack('>I',len(body))+tag+body+struct.pack('>I',zlib.crc32(tag+body)&0xffffffff)
 out=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(data,9))+chunk(b'IEND',b'')
 (root/'extension/icons'/f'icon-{size}.png').write_bytes(out)
