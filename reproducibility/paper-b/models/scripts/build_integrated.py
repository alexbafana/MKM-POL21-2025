#!/usr/bin/env python3
"""Embed original DAOMod definitions and institutional additions in one RDF/XML file."""
from pathlib import Path
import copy,json,hashlib,xml.etree.ElementTree as E
R=Path(__file__).resolve().parents[1]
NS={'rdf':'http://www.w3.org/1999/02/22-rdf-syntax-ns#','rdfs':'http://www.w3.org/2000/01/rdf-schema#','owl':'http://www.w3.org/2002/07/owl#','xsd':'http://www.w3.org/2001/XMLSchema#'}
IRI='urn:paper-b:integrated-institutional-daomod:1.0.0'
COMMENT='Integrated research version: unchanged upstream definitions plus institutional additions embedded in this file. Not an upstream release. Structural/RDF validation is distinct from OWL logical consistency, deployed enforcement and legal adequacy.'
SOURCE='https://github.com/SoweluAvanzo/DAOMod/blob/9ce3fc44dbb20d6441539f5992929746778bcbcc/DAOMod%20Ontology/DAOMod_Ontology.rdf'
def build():
 for k,v in NS.items():E.register_namespace(k,v)
 original=R/'schemas/DAOMod_Ontology.rdf';before=hashlib.sha256(original.read_bytes()).hexdigest()
 root=copy.deepcopy(E.parse(original).getroot())
 extension=E.parse(R/'Institutional_DAOMod.rdf').getroot()
 for n in extension:
  if n.tag!='{'+NS['owl']+'}Ontology':root.append(copy.deepcopy(n))
 header=E.SubElement(root,'{'+NS['owl']+'}Ontology',{'{'+NS['rdf']+'}about':IRI})
 for tag,value,attr in [('owl:versionInfo','1.0.0 integrated institutional specialization',None),('rdfs:comment',COMMENT,None),('rdfs:seeAlso',SOURCE,'resource')]:
  pre,name=tag.split(':');n=E.SubElement(header,'{'+NS[pre]+'}'+name)
  if attr:n.set('{'+NS['rdf']+'}'+attr,value)
  else:n.text=value
 E.indent(root);out=R/'DAOMod_Institutional_Integrated.rdf';E.ElementTree(root).write(out,encoding='utf-8',xml_declaration=True)
 assert hashlib.sha256(original.read_bytes()).hexdigest()==before,'original modified'
 print('Built '+out.name+'; original SHA-256 unchanged: '+before)
if __name__=='__main__':build()
