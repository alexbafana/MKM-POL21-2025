from pathlib import Path
import sys,xml.etree.ElementTree as E
r=Path(__file__).resolve().parents[1];sys.path.insert(0,str((r/'scripts').resolve()));from notation_renderer import drawio_node,svg_node
out=r/'extended-views';nodes={'SemanticAsset':(30,270,'employment graph / v1, v2'),'TransitionPlan':(340,270,'Plan-Publish-v1'),'Authorization':(650,270,'Authorization-1 / expiry, nonce'),'Confirmation':(960,270,'Confirmation-1 / idempotence'),'AttemptReceipt':(960,500,'Receipt-1 / result manifest'),'Admission':(340,40,'current eligible principals'),'Mandate':(30,40,'validity and institutional scope'),'CoordinationPolicy':(650,40,'Policy-Publication / quorum, timing')};edges=[('TransitionPlan','hasAsset','SemanticAsset'),('Authorization','hasPlan','TransitionPlan'),('Confirmation','hasReceipt','AttemptReceipt'),('Admission','hasMandate','Mandate'),('TransitionPlan','requiresPolicy','CoordinationPolicy')]
mx=E.Element('mxfile');dg=E.SubElement(mx,'diagram',id='Binding',name='WoodHive reserved ontology property bindings');gm=E.SubElement(dg,'mxGraphModel');root=E.SubElement(gm,'root');E.SubElement(root,'mxCell',id='0');E.SubElement(root,'mxCell',id='1',parent='0');svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="710"><rect width="1300" height="710" fill="white"/><defs><marker id="a" markerWidth="14" markerHeight="8" refX="13" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z M7,0 L7,6 L13,3 z" fill="#334155"/></marker></defs>']
for a,p,b in edges:
 x,y,_=nodes[a];xx,yy,_=nodes[b];sx=x+140;tx=xx+140
 if p=='hasReceipt':path=f'M{sx},{y+140} V{yy}';lx=sx+30;ly=(y+140+yy)/2
 elif p=='hasMandate':path=f'M{sx},{y+140} V215 H{tx} V{yy+140}';lx=(sx+tx)/2;ly=202
 elif p=='requiresPolicy':path=f'M{sx},{y} V205 H{tx} V{yy+140}';lx=(sx+tx)/2;ly=193
 else:path=f'M{sx},{y} V235 H{tx} V{yy}';lx=(sx+tx)/2;ly=222
 svg.append(f'<path d="{path}" fill="none" stroke="#334155" stroke-width="1.5" marker-end="url(#a)"/><text x="{lx}" y="{ly}" text-anchor="middle" font-size="12" font-family="sans-serif">IKG:{p}</text>')
 n=E.SubElement(root,'mxCell',id=a+'-'+b,edge='1',parent='1',source=a,target=b,value='IKG:'+p,style='edgeStyle=orthogonalEdgeStyle;endArrow=doubleBlock;',ontologyProperty='urn:paper-b:institutional-daomod:'+p);E.SubElement(n,'mxGeometry',relative='1',attrib={'as':'geometry'})
for k,(x,y,v) in nodes.items():drawio_node(root,k,x,y,width=280,height=140,pointer=v);svg.append(svg_node(k,x,y,width=280,height=140,pointer=v))
svg.append('<text x="30" y="690" font-family="sans-serif" font-size="14">IKG-tagged tandem arrows denote ontology properties, not process order. All extension cards carry paired tabs.</text></svg>');E.indent(mx);E.ElementTree(mx).write(out/'OntologyBindings.drawio',encoding='utf-8',xml_declaration=True);(out/'OntologyBindings.svg').write_text(''.join(svg))
