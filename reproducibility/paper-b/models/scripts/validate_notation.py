#!/usr/bin/env python3
from pathlib import Path
import json,xml.etree.ElementTree as E,copy
R=Path(__file__).resolve().parents[1]
def check(n):
 if n.get('extension_frame','').split(':')[0]!='IKG-TWIN-TAB':raise ValueError('missing reserved extension frame')
 markers=[x.get('reserved_marker','') for x in n['families'].values()]
 if len(markers)!=9 or len(set(markers))!=9 or not all(x.startswith('IKG:') for x in markers):raise ValueError('invalid reserved marker catalog')
 profile=json.loads((R/'institutional-profile.json').read_text());expected={x['id']:x for x in profile['elements']};symbols=n['symbols']
 if len(symbols)!=36 or {x['class'] for x in symbols}!=set(expected):raise ValueError('notation concept coverage')
 for x in symbols:
  p=expected[x['class']]
  if x['ontology_class']!='urn:paper-b:institutional-daomod:'+x['class'] or x['requirement']!=p['requirement'] or x['layer']!=p['layer'] or x['family'] not in n['families']:raise ValueError('invalid notation symbol binding')
 return {x['class']:x for x in symbols}
def main():
 n=json.loads((R/'notation/notation.json').read_text());symbols=check(n);count=0
 for layer in ['Organization','Coordination','Execution','Safeguard']:
  diagram=E.parse(R/'extended-views'/(layer+'.drawio'))
  for cell in diagram.iter('mxCell'):
   if cell.get('id') not in symbols:continue
   sym=symbols[cell.get('id')]
   if cell.get('ontologyClass')!=sym['ontology_class'] or cell.get('requirement')!=sym['requirement'] or cell.get('notationFamily')!=sym['family'] or cell.get('notationFrame')!='IKG-TWIN-TAB' or not cell.get('value','').startswith(n['families'][sym['family']]['reserved_marker']) or '<<'+sym['class']+'>>' not in cell.get('value',''):raise ValueError('diagram notation mismatch')
   count+=1
 if count!=36:raise ValueError('diagram concept coverage')
 for f in list((R/'extended-views').glob('*.svg'))+[R/'notation/Legend.drawio',R/'notation/Legend.svg']:E.parse(f)
 negative=[]
 for kind in ['missing symbol','unknown family']:
  bad=copy.deepcopy(n)
  if kind=='missing symbol':bad['symbols'].pop()
  else:bad['symbols'][0]['family']='unknown'
  try:check(bad)
  except ValueError:negative.append({'case':kind,'status':'rejected'})
  else:raise ValueError('invalid notation admitted')
 (R/'results/notation-validation.json').write_text(json.dumps({'status':'pass','symbols':36,'diagram_symbol_bindings':count,'families':9,'reserved_markers':9,'extension_frame':'IKG-TWIN-TAB','manual_comparison':'Thesis Tables 4.1–4.3, 4.5–4.6 and 4.8; see notation/thesis-notation-comparison.csv','negative_checks':negative,'scope':'Catalog completeness and diagram-to-ontology metadata; not perceptual, usability or semantic-adequacy validation.'},indent=2)+'\n');print('PASS: 36 symbols, 9 families, 36 diagram bindings; 2 invalid notation catalogs rejected.')
if __name__=='__main__':main()
