"""Reproduce bounded structural checks and report semantic/profile gaps separately."""
import csv, hashlib, json, subprocess, xml.etree.ElementTree as ET
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def rows(name):return list(csv.DictReader((R/'traceability'/name).open()))
records=rows('records.csv');links=rows('links.csv');maps=rows('destinations.csv')
ids={r['record_id'] for r in records};errors=[];gaps=[]
if len(ids)!=len(records):errors.append('Duplicate record identifier')
for l in links:
    if l['from_record_id'] not in ids or (l['to_kind']=='record' and l['to_id'] not in ids):errors.append('Unresolved link '+l['link_id'])
models={};validation={}
for kind,file,schema in [('DAOMod-DAO-ML','Currynomics_DAO-ML.model.xml','DAO-ML.xsd'),('DAOMod-ERD','Currynomics_ET-DM.model.xml','ERD.xsd')]:
    p=R/'models'/file;root=ET.parse(p).getroot(); models[kind]={v for e in root.iter() for k,v in e.attrib.items() if k in ('id','DAO_ID','gov_area_ID','permission_ID','uniqueID')}
    result=subprocess.run(['xmllint','--noout','--schema',str(Path('schemas')/schema),str(Path('models')/file)],capture_output=True,text=True,cwd=R)
    validation[kind]={'passed':result.returncode==0,'diagnostic':result.stderr.strip()}
    if result.returncode:errors.append(kind+' XSD failure')
for p in sorted((R/'models').glob('*.drawio')):ET.parse(p)
for m in maps:
    if m['source_record_id'] not in ids:errors.append('Unresolved mapping source '+m['mapping_id'])
    target=m['target_element_id_or_path']
    if m['preservation_location']=='native_model' and target not in models.get(m['target_model'],set()):gaps.append({'mapping':m['mapping_id'],'issue':'Candidate target is not an exact XML ID; expert disposition needed','target':target})
required={'authority':['authority_right','authority_object','implementation_owner'],'token_policy':['lifecycle_stage'],'concentration_pathway':['concentration_dimensions'],'monitoring':['concentration_dimensions','unit_or_qualitative_basis','population','observation_window','data_source']}
for r in records:
    missing=[f for f in required.get(r['kind'],[]) if not r[f]]
    if missing:gaps.append({'record':r['record_id'],'issue':'Grouped source or unavailable field requires profile completion','fields':missing})
result={'scope':'Automated author-package structural checks; no independent use or semantic validation','records':len(records),'links':len(links),'mappings':len(maps),'schema_validation':validation,'errors':errors,'profile_gaps':gaps,'profile_complete':not gaps,'independent_reconstruction_completed':False}
(R/'results/automated-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['profile_gaps','schema_validation']},indent=2));print('Profile gaps:',len(gaps))
raise SystemExit(bool(errors))
