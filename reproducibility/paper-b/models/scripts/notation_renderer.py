"""Compound node symbols: readable frame + reserved IKG family marker + class stereotype."""
import html,xml.etree.ElementTree as E,json,textwrap
from pathlib import Path
R=Path(__file__).resolve().parents[1]
NOTATION=json.loads((R/'notation/notation.json').read_text())
SYMBOLS={x['class']:x for x in NOTATION['symbols']}
COLORS={'Organization':'#e8f0fb','Coordination':'#e8f5e9','Execution':'#fff3df','Safeguard':'#f4e9fa'}
def glyph(family,x,y):
 marker=NOTATION['families'][family]['reserved_marker']
 return f'<text x="{x}" y="{y+16}" font-family="sans-serif" font-size="12" font-weight="bold">{marker}</text>'
def drawio_node(root,concept,x,y,width=360,height=140,instance=None,pointer=None):
 sym=SYMBOLS[concept];badge=NOTATION['layers'][sym['layer']];identity=instance or 'WoodHive-'+concept;pointer=pointer or sym['worked_case_pointer']
 label=f'{NOTATION["families"][sym["family"]]["reserved_marker"]} | {badge} | {sym["family"]}\n<<{concept}>> [{sym["requirement"]}]\n{identity}\n{pointer}'
 n=E.SubElement(root,'mxCell',id=concept,value=label,vertex='1',parent='1',style='rounded=0;whiteSpace=wrap;html=0;align=left;spacingLeft=10;fillColor='+COLORS[sym['layer']]+';',ontologyClass=sym['ontology_class'],requirement=sym['requirement'],notationFamily=sym['family'],notationFrame='IKG-TWIN-TAB')
 E.SubElement(n,'mxGeometry',x=str(x),y=str(y),width=str(width),height=str(height),attrib={'as':'geometry'})
 for i in range(2):
  tab=E.SubElement(root,'mxCell',id=concept+'-tab-'+str(i),vertex='1',parent=concept,style='shape=triangle;direction=east;fillColor='+COLORS[sym['layer']]+';strokeColor=#334155;')
  E.SubElement(tab,'mxGeometry',x=str(width-1),y=str(8+i*15),width='10',height='15',attrib={'as':'geometry'})
 return n
def svg_node(concept,x,y,width=360,height=140,instance=None,pointer=None):
 sym=SYMBOLS[concept];badge=NOTATION['layers'][sym['layer']];lines=[f'{NOTATION["families"][sym["family"]]["reserved_marker"]} | {badge} | {sym["family"]}',f'<<{concept}>> [{sym["requirement"]}]',instance or 'WoodHive-'+concept,pointer or sym['worked_case_pointer']]
 lines=[line for v in lines for line in textwrap.wrap(v,39)]
 outline=f'M{x},{y} H{x+width} l9,8 -9,8 9,8 -9,8 V{y+height} H{x} Z'
 return f'<path d="{outline}" fill="{COLORS[sym["layer"]]}" stroke="#334155"/>'+f'<text x="{x+10}" y="{y+22}" font-family="sans-serif" font-size="13">'+''.join(f'<tspan x="{x+10}" dy="{0 if i==0 else 21}">{html.escape(line)}</tspan>' for i,line in enumerate(lines))+'</text>'
