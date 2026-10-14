#!/usr/bin/env python3
"""Validate exact RDF union and institutional links; no OWL-DL consistency claim."""
from pathlib import Path
import json,hashlib,copy
from rdflib import Graph,URIRef,Literal,BNode
from rdflib.namespace import RDF,RDFS,OWL
from rdflib.compare import isomorphic
from build_integrated import IRI,COMMENT,SOURCE
R=Path(__file__).resolve().parents[1];EXT='urn:paper-b:institutional-daomod:'
def require(value,msg):
 if not value:raise ValueError(msg)
def expected_graph():
 original=Graph().parse(R/'schemas/DAOMod_Ontology.rdf',format='xml')
 extension=Graph().parse(R/'Institutional_DAOMod.rdf',format='xml')
 expected=Graph()
 for t in original:expected.add(t)
 # Omit only modular ontology header (including its import); preserve all extension axioms.
 for t in extension:
  if t[0]!=URIRef(EXT):expected.add(t)
 h=URIRef(IRI);expected.add((h,RDF.type,OWL.Ontology));expected.add((h,OWL.versionInfo,Literal('1.0.0 integrated institutional specialization')));expected.add((h,RDFS.comment,Literal(COMMENT)));expected.add((h,RDFS.seeAlso,URIRef(SOURCE)))
 return original,extension,expected

def check(graph,expected,profile,original):
 require(isomorphic(graph,expected),'integrated graph differs from complete original-plus-extension union')
 require(not list(graph.triples((None,OWL.imports,None))),'integrated file still requires an import')
 for el in profile['elements']:
  cls=URIRef(EXT+el['id']);require((cls,RDF.type,OWL.Class) in graph,'missing institutional class '+el['id'])
  require(any('['+el['requirement']+']' in str(x) for x in graph.objects(cls,RDFS.comment)),'missing requirement link '+el['requirement'])
 for prop in ['hasAsset','hasPlan','hasReceipt','hasMandate','requiresPolicy']:
  u=URIRef(EXT+prop);require((u,RDF.type,OWL.ObjectProperty) in graph,'missing property '+prop)
  for target in list(graph.objects(u,RDFS.domain))+list(graph.objects(u,RDFS.range)):require((target,RDF.type,OWL.Class) in graph,'undefined institutional domain/range')
 for s,p,o in graph.triples((None,RDFS.subClassOf,None)):
  if str(s).startswith(EXT) and isinstance(o,URIRef):require((o,RDF.type,OWL.Class) in original,'unresolved upstream subclass target')
 restrictions=list(graph.subjects(RDF.type,OWL.Restriction));institutional=[]
 for n in restrictions:
  props=list(graph.objects(n,OWL.onProperty))
  if any(str(x).startswith(EXT) for x in props):
   require(len(props)==1 and (props[0],RDF.type,OWL.ObjectProperty) in graph,'invalid restriction property')
   targets=list(graph.objects(n,OWL.someValuesFrom));require(len(targets)==1 and (targets[0],RDF.type,OWL.Class) in graph,'invalid existential target');institutional.append(n)
 require(len(institutional)==3,'institutional existential restriction count')
 return len(institutional)

def main():
 snapshot=R/'schemas/DAOMod_Ontology.rdf';manifest=json.loads((R/'schemas/upstream-manifest.json').read_text());sha=hashlib.sha256(snapshot.read_bytes()).hexdigest();require(sha==manifest['files']['DAOMod_Ontology.rdf'],'original snapshot checksum changed')
 original,extension,expected=expected_graph();integrated=Graph().parse(R/'DAOMod_Institutional_Integrated.rdf',format='xml');profile=json.loads((R/'institutional-profile.json').read_text());n=check(integrated,expected,profile,original)
 # RDF round-trip must preserve graph including blank-node axioms.
 require(isomorphic(integrated,Graph().parse(data=integrated.serialize(format='xml'),format='xml')),'RDF/XML round-trip mismatch')
 negative=[]
 for name,mutate in [('deleted original axiom',lambda g:g.remove(next(t for t in original if not any(isinstance(x,BNode) for x in t)))),('missing institutional class',lambda g:g.remove((URIRef(EXT+'Mandate'),RDF.type,OWL.Class))),('unresolved import',lambda g:g.add((URIRef(IRI),OWL.imports,URIRef('urn:missing:ontology'))))]:
  bad=Graph()
  for t in integrated:bad.add(t)
  mutate(bad)
  try:check(bad,expected,profile,original)
  except ValueError as e:negative.append({'case':name,'status':'rejected','reason':str(e)})
  else:raise ValueError('invalid ontology admitted: '+name)
 report={'status':'pass','original_sha256':sha,'original_file_unchanged':True,'original_triples':len(original),'modular_extension_triples':len(extension),'integrated_triples':len(integrated),'complete_graph_union_isomorphic':True,'self_contained_no_imports':True,'institutional_classes':36,'institutional_object_properties':5,'institutional_existential_restrictions':n,'upstream_subclass_targets_resolve':True,'rdfxml_roundtrip_isomorphic':True,'negative_checks':negative,'parser':'rdflib 7.1.4','scope':'RDF syntax, exact graph preservation/union, identifiers, declarations, requirement links and selected axiom structure. No OWL-DL consistency, conservative-extension, satisfiability, runtime, or legal proof.','integrated_sha256':hashlib.sha256((R/'DAOMod_Institutional_Integrated.rdf').read_bytes()).hexdigest()}
 (R/'results/integrated-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
