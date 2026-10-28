#!/usr/bin/env python3
"""Check explicit institutional model types against ontology, mapping and worked values."""
from pathlib import Path
import json,copy,subprocess,xml.etree.ElementTree as E
from rdflib import Graph,URIRef
from rdflib.namespace import RDF,RDFS,OWL
R=Path(__file__).resolve().parents[1];NS='urn:paper-b:institutional-model-view:1.0';ONT='urn:paper-b:institutional-daomod:'
def require(ok,msg):
 if not ok:raise ValueError(msg)
def check(documents,relations):
 profile=json.loads((R/'institutional-profile.json').read_text());case=json.loads((R/'WoodHive.institutional.json').read_text());ontology=Graph().parse(R/'DAOMod_Institutional_Integrated.rdf',format='xml');defined={x['id']:x for x in profile['elements']};instances={};results=[]
 for layer,root in documents.items():
  require(root.tag=='{'+NS+'}Institutional'+layer+'Model','wrong institutional model type')
  expected=[x['id'] for x in profile['elements'] if x['layer']==layer];require([n.tag.split('}')[-1] for n in root]==expected,'incomplete layer concepts')
  for n in root:
   concept=n.tag.split('}')[-1];spec=defined[concept];iri=URIRef(n.get('ontologyClass'));require(str(iri)==ONT+concept and (iri,RDF.type,OWL.Class) in ontology,'unknown ontology class')
   require(n.get('requirement')==spec['requirement'] and n.get('baseElement')==spec['base_element'],'wrong requirement/base binding')
   require(n.get('casePointer')==spec['worked_case_pointer'],'wrong field pointer');value=case
   for key in n.get('casePointer').strip('/').split('/'):value=value[key]
   require(json.loads(n.find('{'+NS+'}value').text)==value,'worked value diverges from authoritative instance')
   require(n.get('id') not in instances,'duplicate instance id');instances[n.get('id')]=iri;results.append({'requirement':spec['requirement'],'class':str(iri),'instance':n.get('id'),'status':'pass'})
 require(len(instances)==36,'instance count')
 expected_relations={(f'WoodHive-{a}',ONT+b,f'WoodHive-{c}') for a,b,c in [('TransitionPlan','hasAsset','SemanticAsset'),('Authorization','hasPlan','TransitionPlan'),('Confirmation','hasReceipt','AttemptReceipt'),('Admission','hasMandate','Mandate'),('TransitionPlan','requiresPolicy','CoordinationPolicy')]}
 require({(x['source'],x['property'],x['target']) for x in relations}==expected_relations and len(relations)==5,'incomplete/altered cross-view relationships')
 for rel in relations:
  require(rel['source'] in instances and rel['target'] in instances,'dangling relation instance');prop=URIRef(rel['property']);require((prop,RDF.type,OWL.ObjectProperty) in ontology,'unknown relation property')
  require((prop,RDFS.domain,instances[rel['source']]) in ontology and (prop,RDFS.range,instances[rel['target']]) in ontology,'relation domain/range mismatch')
 return results

def main():
 docs={layer:E.parse(R/'extended-views'/('WoodHive_'+layer+'.xml')).getroot() for layer in ['Organization','Coordination','Execution','Safeguard']}
 for layer in docs:
  file=R/'extended-views'/('WoodHive_'+layer+'.xml');p=subprocess.run(['xmllint','--noout','--schema',str(R/'schemas/InstitutionalModelViews.xsd'),str(file)],capture_output=True,text=True);require(p.returncode==0,p.stderr)
 relations=json.loads((R/'extended-views/relations.json').read_text());results=check(docs,relations);negative=[]
 for name in ['missing concept','unknown ontology class','divergent worked value','wrong requirement','missing relationship','dangling target']:
  d=copy.deepcopy(docs);rr=copy.deepcopy(relations)
  if name=='missing concept':d['Organization'].remove(d['Organization'][0])
  elif name=='unknown ontology class':d['Organization'][0].set('ontologyClass','urn:unknown:class')
  elif name=='divergent worked value':d['Organization'][0].find('{'+NS+'}value').text='{}'
  elif name=='wrong requirement':d['Organization'][0].set('requirement','SG12')
  elif name=='missing relationship':rr.pop()
  else:rr[0]['target']='missing'
  try:check(d,rr)
  except ValueError as e:negative.append({'case':name,'status':'rejected','reason':str(e)})
  else:raise ValueError('invalid view admitted: '+name)
 report={'status':'pass','typed_model_views':4,'requirement_bound_instances':36,'ontology_property_links':5,'negative_checks':negative,'bindings':results,'scope':'Proposed institutional view XSD, exact class/requirement/base bindings, worked-value equality and declared relation domain/range. Not official upstream model syntax, independent usability, deployed enforcement or OWL-DL consistency.'};(R/'results/extended-view-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS: 4 typed views, 36 concrete bindings, 5 ontology links; 6 invalid variants rejected.')
if __name__=='__main__':main()
