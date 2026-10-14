"""Compound node symbols: readable frame + geometric family glyph + class stereotype."""
import html,xml.etree.ElementTree as E,json,textwrap
from pathlib import Path
R=Path(__file__).resolve().parents[1]
NOTATION=json.loads((R/'notation/notation.json').read_text())
SYMBOLS={x['class']:x for x in NOTATION['symbols']}
COLORS={'Organization':'#e8f0fb','Coordination':'#e8f5e9','Execution':'#fff3df','Safeguard':'#f4e9fa'}
def glyph(family,x,y):
 color='stroke="#334155" stroke-width="1.5" fill="white"'
 if family in ['ASSET','PLAN']:return f'<rect x="{x+3}" y="{y}" width="18" height="17" {color}/><rect x="{x}" y="{y+4}" width="18" height="17" {color}/>'
 if family=='STATE':return f'<rect x="{x}" y="{y+4}" width="24" height="14" rx="7" {color}/>'
 if family=='ACTOR':return f'<circle cx="{x+11}" cy="{y+11}" r="10" {color}/>'
 if family=='GATE':return f'<path d="M{x+11},{y} L{x+22},{y+11} L{x+11},{y+22} L{x},{y+11} Z" {color}/>'
 if family=='MONITOR':return f'<path d="M{x+5},{y} L{x+18},{y} L{x+24},{y+11} L{x+18},{y+22} L{x+5},{y+22} L{x},{y+11} Z" {color}/>'
 if family=='SCOPE':return f'<path d="M{x+5},{y} L{x},{y} L{x},{y+22} L{x+5},{y+22} M{x+19},{y} L{x+24},{y} L{x+24},{y+22} L{x+19},{y+22}" {color}/>'
 return f'<path d="M{x},{y} L{x+17},{y} L{x+24},{y+7} L{x+24},{y+22} L{x},{y+22} Z M{x+17},{y} L{x+17},{y+7} L{x+24},{y+7}" {color}/>'
def drawio_node(root,concept,x,y,width=360,height=140,instance=None,pointer=None):
 sym=SYMBOLS[concept];badge=NOTATION['layers'][sym['layer']];identity=instance or 'WoodHive-'+concept;pointer=pointer or sym['worked_case_pointer']
 label=f'{badge} | {sym["family"]}\n<<{concept}>> [{sym["requirement"]}]\n{identity}\n{pointer}'
 n=E.SubElement(root,'mxCell',id=concept,value=label,vertex='1',parent='1',style='rounded=0;whiteSpace=wrap;html=0;align=left;spacingLeft=35;fillColor='+COLORS[sym['layer']]+';',ontologyClass=sym['ontology_class'],requirement=sym['requirement'],notationFamily=sym['family'])
 E.SubElement(n,'mxGeometry',x=str(x),y=str(y),width=str(width),height=str(height),attrib={'as':'geometry'})
 shape={'ASSET':'rectangle','PLAN':'rectangle','STATE':'ellipse','ACTOR':'ellipse','SCOPE':'rectangle','GATE':'rhombus','MONITOR':'hexagon','POLICY':'note','RECORD':'note'}[sym['family']]
 icon=E.SubElement(root,'mxCell',id=concept+'-glyph',vertex='1',parent=concept,style='shape='+shape+';fillColor=#ffffff;strokeColor=#334155;');E.SubElement(icon,'mxGeometry',x='8',y='10',width='20',height='20',attrib={'as':'geometry'})
 return n
def svg_node(concept,x,y,width=360,height=140,instance=None,pointer=None):
 sym=SYMBOLS[concept];badge=NOTATION['layers'][sym['layer']];lines=[f'{badge} | {sym["family"]}',f'<<{concept}>> [{sym["requirement"]}]',instance or 'WoodHive-'+concept,pointer or sym['worked_case_pointer']]
 lines=[line for v in lines for line in textwrap.wrap(v,39)]
 return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" fill="{COLORS[sym["layer"]]}" stroke="#334155"/>'+glyph(sym['family'],x+8,y+8)+f'<text x="{x+35}" y="{y+22}" font-family="sans-serif" font-size="13">'+''.join(f'<tspan x="{x+35}" dy="{0 if i==0 else 21}">{html.escape(line)}</tspan>' for i,line in enumerate(lines))+'</text>'
