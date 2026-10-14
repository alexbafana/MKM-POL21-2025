from notation_renderer import drawio_node, svg_node
from pathlib import Path
import json,xml.etree.ElementTree as E,html,textwrap
r=Path(__file__).resolve().parents[1];p=json.loads((r/'institutional-profile.json').read_text());case=json.loads((r/'WoodHive.institutional.json').read_text());NS='urn:paper-b:institutional-model-view:1.0';ONT='urn:paper-b:institutional-daomod:'
E.register_namespace('ikg',NS);X='http://www.w3.org/2001/XMLSchema';E.register_namespace('xs',X)
def value(pointer):
 v=case
 for k in pointer.strip('/').split('/'):v=v[k]
 return v
def sub(parent,name,**a):return E.SubElement(parent,'{'+NS+'}'+name,{k:str(v) for k,v in a.items()})
layers=['Organization','Coordination','Execution','Safeguard'];links=[('TransitionPlan','hasAsset','SemanticAsset'),('Authorization','hasPlan','TransitionPlan'),('Confirmation','hasReceipt','AttemptReceipt'),('Admission','hasMandate','Mandate'),('TransitionPlan','requiresPolicy','CoordinationPolicy')]
schema=E.Element('{'+X+'}schema',targetNamespace=NS,elementFormDefault='qualified',attrib={'xmlns:ikg':NS})
b=E.SubElement(schema,'{'+X+'}complexType',name='ConcreteBindingType');seq=E.SubElement(b,'{'+X+'}sequence');E.SubElement(seq,'{'+X+'}element',name='value',type='xs:string')
for name,typ in [('id','xs:ID'),('ontologyClass','xs:anyURI'),('requirement','xs:string'),('baseElement','xs:string'),('casePointer','xs:string')]:E.SubElement(b,'{'+X+'}attribute',name=name,type=typ,use='required')
for layer in layers:
 node=E.SubElement(schema,'{'+X+'}element',name='Institutional'+layer+'Model');ct=E.SubElement(node,'{'+X+'}complexType');seq=E.SubElement(ct,'{'+X+'}sequence')
 for el in p['elements']:
  if el['layer']==layer:E.SubElement(seq,'{'+X+'}element',name=el['id'],type='ikg:ConcreteBindingType')
 E.SubElement(ct,'{'+X+'}attribute',name='ontology',type='xs:string',use='required');E.SubElement(ct,'{'+X+'}attribute',name='baseModel',type='xs:string',use='required');E.SubElement(ct,'{'+X+'}attribute',name='illustrative',type='xs:boolean',use='required')
# Required relation source and target are checked across the four files by the validator.
for layer in layers:
 items=[el for el in p['elements'] if el['layer']==layer];node=E.Element('{'+NS+'}Institutional'+layer+'Model',ontology='../DAOMod_Institutional_Integrated.rdf',baseModel='../'+items[0]['base_model'],illustrative='true')
 for el in items:
  n=sub(node,el['id'],id='WoodHive-'+el['id'],ontologyClass=ONT+el['id'],requirement=el['requirement'],baseElement=el['base_element'],casePointer=el['worked_case_pointer']);sub(n,'value').text=json.dumps(value(el['worked_case_pointer']),sort_keys=True)
 E.indent(node);E.ElementTree(node).write(r/'extended-views'/('WoodHive_'+layer+'.xml'),encoding='utf-8',xml_declaration=True)
 # One node per actual ontology concept, labelled with exact requirement and worked field.
 mx=E.Element('mxfile');dg=E.SubElement(mx,'diagram',name='Institutional '+layer,id=layer);gm=E.SubElement(dg,'mxGraphModel');rr=E.SubElement(gm,'root');E.SubElement(rr,'mxCell',id='0');E.SubElement(rr,'mxCell',id='1',parent='0')
 height=120+((len(items)+2)//3)*170;svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}"><rect width="1200" height="{height}" fill="white"/><text x="30" y="35" font-family="sans-serif" font-size="22">WoodHive institutional {layer} model</text>']
 for i,el in enumerate(items):
  x=30+(i%3)*390;y=65+(i//3)*170;label=f"{el['id']} [{el['requirement']}]\nWoodHive-{el['id']}\n{el['worked_case_pointer']}"
  drawio_node(rr,el['id'],x,y)
  svg.append(svg_node(el['id'],x,y))
 svg.append(f'<text x="30" y="{height-15}" font-family="sans-serif" font-size="14">Explicit ontology bindings; values in matching XML. Synthetic design instance, not runtime assurance.</text></svg>')
 E.indent(mx);E.ElementTree(mx).write(r/'extended-views'/(layer+'.drawio'),encoding='utf-8',xml_declaration=True);(r/'extended-views'/(layer+'.svg')).write_text(''.join(svg))
E.indent(schema);E.ElementTree(schema).write(r/'schemas/InstitutionalModelViews.xsd',encoding='utf-8',xml_declaration=True)
(r/'extended-views/relations.json').write_text(json.dumps([{'source':'WoodHive-'+a,'property':ONT+b,'target':'WoodHive-'+c} for a,b,c in links],indent=2)+'\n')
