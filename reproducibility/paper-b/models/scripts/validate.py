#!/usr/bin/env python3
"""Model presence/consistency and adversarial fixture checks; no deployed enforcement claim."""
from pathlib import Path
import json,csv,hashlib,subprocess,copy,sys,xml.etree.ElementTree as E
R=Path(__file__).resolve().parents[1]
def require(ok,message):
 if not ok:raise ValueError(message)
def validate_case(c):
 p=c['plan'];ev=c['evidence'];d=c['decision'];a=c['authorization'];b=c['binding'];receipt=c['receipt'];policy=c['policy'];sg=c['safeguards']
 require(p['asset']==c['asset']['id'],'wrong asset')
 for step in p['steps']:require([step['operation'],step['source'],step['target']] in c['lifecycle']['transitions'],'invalid transition')
 require(ev['validation_passed'] and c['roles']['Producer']!=ev['validator'],'validation prerequisite or separation')
 require(len(set(d['participants']))>=policy['quorum'],'quorum')
 require(set(d['participants'])<=set(c['principals']),'unknown principal')
 require(set(d['participants'])<=set(c['role_assignments']['Authorizer']) and set(d['participants'])<=set(c['committee_members']['C-Publication']),'unauthorized committee participant')
 require(len(set(c['roles'].values()))>=policy['min_independent_principals'],'distribution')
 for x,y in sg['incompatible_roles']:require(c['roles'][x]!=c['roles'][y],'incompatible roles')
 for m in c['mandates']:require(m['valid_from']<=50<m['valid_until'],'invalid mandate')
 require(d['outcome']=='accepted' and d['plan']==p['id'],'decision not accepted or wrong plan')
 require(a['decision']==d['id'] and a['plan']==p['id'] and a['expires']>50,'wrong authorization or expiry')
 require(a['executor']==receipt['executor']==c['roles']['Executor'],'wrong executor')
 require(b['authorization']==a['id'] and b['plan']==p['id'],'wrong binding')
 require(ev['canonicalization']=='RDFC-1.0' and ev['hash']=='SHA-256','unspecified content method')
 require(receipt['binding']==b['id'] and receipt['status']=='success' and receipt['failure'] is None,'invalid success receipt')
 require(len(receipt['result_manifest'])==len(p['steps']),'incomplete result manifest')
 for step,result in zip(p['steps'],receipt['result_manifest']):
  require(result['version']==step['version'] and result['state']==step['target'],'wrong result version or state')
  require(result['digest']==b['expected_digest']==ev['digest'],'content mismatch')
 require(bool(receipt['commit_id']),'missing common commit')
 require(c['confirmation']['receipt']==receipt['id'] and c['confirmation']['idempotence_key']==b['id'],'wrong confirmation linkage')
 chain=[[ev['id'],p['id']],[p['id'],d['id']],[d['id'],a['id']],[a['id'],b['id']],[b['id'],receipt['id']],[receipt['id'],'v1']]
 require(c['lineage']==chain,'broken lineage')
 require(sg['protected_evidence']['onchain_content'] is False,'protected evidence exposure')
 require(sg['emergency']['max_blocks']>0 and sg['emergency']['notification_required'] and sg['emergency']['independent_review_required'],'unbounded exceptional policy')
 require(set(['missing-receipt','executor-timeout'])<=set(sg['escalation']['conditions']),'missing escalation specification')
 restore=c['restoration_plan'];require(restore['fresh_authorization_required'] and restore['preserve_history'] and restore['atomic_common_commit_required'],'restoration policy')
 require(len(restore['steps'])==2 and {x['operation'] for x in restore['steps']}=={'restore','supersede'},'incomplete restoration plan')
 for step in restore['steps']:require([step['operation'],step['source'],step['target']] in c['lifecycle']['transitions'],'invalid restoration step')
 return True

def main():
 checks=[]
 for model,schema in [('WoodHive_DAO-ML.model.xml','DAO-ML.xsd'),('WoodHive_ET-DM.model.xml','ERD.xsd')]:
  p=subprocess.run(['xmllint','--noout','--schema',str(R/'schemas'/schema),str(R/model)],capture_output=True,text=True);require(p.returncode==0,p.stderr);checks.append({'check':model+' upstream XSD','status':'pass'})
 models={f:{x.get('id') or x.get('DAO_ID') or x.get('uniqueID') or x.get('permission_ID') or x.get('gov_area_ID') for x in E.parse(R/f).iter()} for f in ['WoodHive_DAO-ML.model.xml','WoodHive_ET-DM.model.xml']}
 # libxml XSD checks syntax; explicitly check IDREFS since tool behavior varies.
 for f in models:
  for n in E.parse(R/f).iter():
   for k in ['decomposed_from','associated_to']:
    if k in n.attrib:require(set(n.get(k).split())<=models[f],f+' dangling '+k)
   if n.tag in ['associated_to','member_of','is_controlled_by','aggregates']:require(set((n.text or '').split())<=models[f],f+' dangling organizational relation')
 profile=json.loads((R/'institutional-profile.json').read_text());case=json.loads((R/'WoodHive.institutional.json').read_text());rows=list(csv.DictReader((R/'requirements.csv').open()))
 expected={f'{prefix}{i}' for prefix,n in [('OLR',12),('CR',6),('ER',6),('SG',12)] for i in range(1,n+1)}
 require(len(rows)==36 and {r['id'] for r in rows}==expected,'requirements mapping')
 require(len(profile['elements'])==36 and {r['requirement'] for r in profile['elements']}==expected,'profile requirement coverage')
 lookup={x['id']:x for x in profile['elements']}
 for r in rows:
  require(r['model_element'] in lookup,'unknown extension element');require(r['base_element'] in models[r['base_model']],'unknown base element');require(lookup[r['model_element']]['requirement']==r['id'],'inconsistent reverse mapping')
  value=case
  for key in r['worked_case_pointer'].strip('/').split('/'):
   require(isinstance(value,dict) and key in value,'unresolved worked-case field');value=value[key]
  require(value is not None,'empty worked-case field')
 for f in ['Institutional_DAOMod.rdf','schemas/DAOMod_Ontology.rdf']:E.parse(R/f)
 owl='http://www.w3.org/2002/07/owl#';rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#';rdfs='http://www.w3.org/2000/01/rdf-schema#'
 up={n.get('{'+rdf+'}about') for n in E.parse(R/'schemas/DAOMod_Ontology.rdf').getroot().findall('{'+owl+'}Class')}
 for n in E.parse(R/'Institutional_DAOMod.rdf').iter('{'+rdfs+'}subClassOf'):
  if n.get('{'+rdf+'}resource'):require(n.get('{'+rdf+'}resource') in up,'unknown upstream class')
 traces=json.loads((R/'worked-traces.json').read_text())['traces']
 require(len(traces)==7 and len({x['id'] for x in traces})==7,'worked trace inventory')
 require(traces[1]['authorization'] is None,'rejected proposal authorization')
 require(traces[3]['receipt']['status']=='failure' and bool(traces[3]['receipt']['failure']),'failure receipt')
 require(len(traces[5]['receipt']['result_manifest'])==2 and bool(traces[5]['receipt']['commit_id']),'compound result manifest')
 require(traces[6]['review']['reviewer_principal']!=traces[6]['review']['intervening_principal'],'independent exceptional review example')
 validate_case(case);checks.append({'check':'worked publication plus restoration specification','status':'pass'})
 # Requirement-level presence/semantic checks: these are model checks, not E/P/N classifications.
 P=case['policy'];S=case['safeguards']
 predicates=[case['asset']['immutable'] and len(case['asset']['versions'])==2,len(case['lifecycle']['states'])==6,all(x['asset']==case['asset']['id'] for x in case['permissions']),len(models['WoodHive_DAO-ML.model.xml'])>=7,'C-Publication' in models['WoodHive_DAO-ML.model.xml'],True,all(set(['subject','asset','transition','action'])<=x.keys() for x in case['permissions']),bool(S['incompatible_roles']) and P['delegation_max_blocks']>0,len(P['evidence'])==4,P['configuration_change_requires_proposal'],bool(P['id']),P['min_independent_principals']>=2,bool(case['plan']['steps']),len(case['mandates'])==3,all(k in P for k in ['method','quorum','threshold','voting_blocks','execution_delay_blocks','delegation_max_blocks']),case['evidence']['validation_passed'] and case['decision']['outcome']=='accepted',all(k in case['decision'] for k in ['outcome','challenge_records','process_status']),'PROP-Admin' in models['WoodHive_ET-DM.model.xml'],case['authorization']['plan']==case['plan']['id'],case['confirmation']['state']=='institutionally-confirmed',bool(case['authorization']['nonce']),case['evidence']['canonicalization']=='RDFC-1.0',all(k in case['receipt'] for k in ['status','failure','result_manifest','commit_id']),case['confirmation']['atomic_technical_update'] and bool(case['confirmation']['idempotence_key']),all('reference' in m and m['valid_until']>m['valid_from'] for m in case['mandates']),len(case['lineage'])==6,bool(case['decision']['rationale']),case['restoration_plan']['preserve_history'],all(k in S['emergency'] for k in ['operations','asset_class','trigger','max_blocks','delegation']),S['emergency']['notification_required'] and S['emergency']['independent_review_required'],all(k in S['compliance'] for k in ['id','jurisdiction','mandate_required','competent_approval_required']),all(k in S['protected_evidence'] for k in ['retention_days','preservation_hold','disclosure','onchain_content']),S['appeal']['effect']=='suspend-and-propose-correction',bool(S['incompatible_roles']) and P['delegation_max_blocks']>0,all(k in S['monitor'] for k in ['max_authority_share','min_participation','watch']),len(S['escalation']['conditions'])==5 and S['escalation']['timeout_blocks']>0]
 # Check actual distinct permission vocabulary instead of a hard-coded satisfaction value.
 tree=E.parse(R/'WoodHive_DAO-ML.model.xml');predicates[5]={n.get('allowed_action') for n in tree.findall('.//Permission')}=={'propose','prepare','validate','authorize','execute','challenge','delegate','administer'}
 require(len(predicates)==36,'predicate count')
 requirement_results=[]
 for row,ok in zip(rows,predicates):require(ok,row['id']+' model obligation');requirement_results.append({'id':row['id'],'model_element':row['model_element'],'check':'presence, reference and applicable worked-case consistency','status':'pass','limit':'Not runtime enforcement, independent review, OWL consistency proof, legal adequacy or canonicalization conformance'})
 mutations=[('wrong asset',lambda c:c['plan'].update(asset='other')),('invalid transition',lambda c:c['plan']['steps'][0].update(target='authorized')),('validation failure',lambda c:c['evidence'].update(validation_passed=False)),('self validation',lambda c:c['evidence'].update(validator='Institution-A')),('quorum failure',lambda c:c['decision'].update(participants=['Institution-C'])),('unknown participant',lambda c:c['decision'].update(participants=['fake','Institution-C'])),('expired mandate',lambda c:c['mandates'][0].update(valid_until=40)),('wrong plan',lambda c:c['authorization'].update(plan='wrong')),('expiry',lambda c:c['authorization'].update(expires=40)),('wrong executor',lambda c:c['receipt'].update(executor='wrong')),('wrong content',lambda c:c['receipt']['result_manifest'][0].update(digest='b'*64)),('missing common commit',lambda c:c['receipt'].update(commit_id='')),('missing lineage',lambda c:c.update(lineage=[])),('protected exposure',lambda c:c['safeguards']['protected_evidence'].update(onchain_content=True)),('unbounded emergency',lambda c:c['safeguards']['emergency'].update(max_blocks=0)),('history erasure',lambda c:c['restoration_plan'].update(preserve_history=False)),('partial compound restoration',lambda c:c['restoration_plan'].update(steps=c['restoration_plan']['steps'][:1]))]
 for name,mutate in mutations:
  changed=copy.deepcopy(case);mutate(changed)
  try:validate_case(changed)
  except ValueError as e:checks.append({'check':name,'expected':'reject','status':'pass','reason':str(e)})
  else:raise ValueError('mutation admitted: '+name)
 report={'status':'pass','model_checks':checks,'requirements':requirement_results,'scope':'Schema compatibility, ID resolution, 36 model mappings, worked fixture consistency and 17 negative mutations; not full modeling-language semantics or deployed governance assurance','upstream_commit':profile['upstream_commit'],'independent_review':'not completed','files':{str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(R.rglob('*')) if p.is_file() and 'results' not in p.parts and '__pycache__' not in p.parts}}
 (R/'results/validation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS: 2 upstream XSD models, 36 mapped model obligations, 17 rejected mutations. See results/validation.json for scope.')
if __name__=='__main__':main()
