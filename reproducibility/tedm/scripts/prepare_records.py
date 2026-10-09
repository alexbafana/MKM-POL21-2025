"""Deterministic serialization of supplied S1-S6; no new empirical observations."""
import csv, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
text=(ROOT/'source/supplementary-artifacts.tex').read_text()
def clean(s):
    s=re.sub(r'\\(?:texttt|textbf|emph|nolinkurl)\{([^{}]*)\}',r'\1',s)
    s=s.replace('$','').replace(r'\rightarrow',' → ').replace(r'\geq',' ≥ ').replace(r'\leq',' ≤ ').replace(r'\%','%')
    return re.sub(r'\s+',' ',s).strip()
def refs(s):
    s=re.sub(r'\b(CG|IN|AR|TP|CP|M|ER|CE)(\d+)--(?:\1)?(\d+)\b',lambda m:', '.join(m[1]+str(i) for i in range(int(m[2]),int(m[3])+1)),s)
    return sorted(set(re.findall(r'\b(?:CG|IN|AR|TP|CP|M|ER|CE)\d+\b',s)))
def write(name,headers,rows):
    with (ROOT/'traceability'/name).open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=headers);w.writeheader();w.writerows(rows)
headers=next(csv.reader((ROOT/'traceability/records.csv').open()))
kinds={'CG':'goal_boundary','IN':'incentive','AR':'authority','TP':'token_policy','CP':'concentration_pathway','M':'monitoring','ER':'engineering_requirement'}
records=[]; provenance=[]; links=[]
for table,block in enumerate(text.split(r'\caption{')[1:7],1):
    body=block.split(r'\midrule',1)[1].split(r'\bottomrule',1)[0]
    for raw in body.split(r'\\'):
        cells=[clean(c) for c in raw.split('&')]
        match=re.match(r'^(CG|IN|AR|TP|CP|M|ER)(\d+)\b',cells[0])
        if not match: continue
        rid=match[0];kind=kinds[match[1]]
        row=dict.fromkeys(headers,'')
        row.update(record_id=rid,record_version='1',kind=kind,record_status='proposed',evidence_status='prospective',statement=' | '.join(cells[1:]),changed_at='2026-10-09T00:00:00+03:00',created_at='2026-10-09T00:00:00+03:00',changed_by='AI-assisted serialization of supplied supplementary tables',unknown_reason='Independent review and approval pending; blank fields are not inferred from unspecified source material.')
        if kind in ['goal_boundary','incentive','authority','token_policy','engineering_requirement']:row['rationale']=cells[-1]
        if kind=='token_policy':row['lifecycle_stage']='Prospective design; '+cells[2]
        if kind=='authority':row.update(authority_object=cells[1],implementation_owner=cells[4],lifecycle_stage='Prospective authority allocation; approval gates retained')
        if kind=='concentration_pathway':
            row.update(concentration_dimensions='|'.join(re.findall(r'\b[OVLX]\b', cells[2].split(';')[0])),assumptions=cells[1],causal_pathway=cells[2],lifecycle_stage=cells[2],treatment=cells[4],review_trigger=cells[5],review_interval=cells[5],residual_risk=cells[6],tradeoffs=cells[6])
        if kind=='monitoring':
            row.update(concentration_dimensions='|'.join(re.findall(r'\b[OVLX]\b',cells[1])),unit_or_qualitative_basis=cells[1],population='Prospective population specified by the measure: '+cells[1],observation_window=cells[4],data_source='Proposed data requirements derived from measure and baseline; availability unverified: '+cells[1]+' | '+cells[2],measure=cells[1],reference_condition=cells[2],identity_assumption=cells[2],interpretation_rule=cells[3],review_trigger=cells[3],review_interval=cells[4],owner_role=cells[4],escalation_action=cells[5],residual_risk='Entity resolution, unavailable operational baselines, and independent review remain unresolved.')
        if kind=='engineering_requirement':row['verification_criterion']='Confirm the stated requirement and linked source records are preserved in the downstream model and external package; independent reconstruction pending.'
        records.append(row)
        provenance.append(dict(record_id=rid,source_file='source/supplementary-artifacts.tex',source_table='S'+str(table),source_cells=' | '.join(cells),conversion='Literal table serialization; grouped authority and multidimensional records retained. No approvals inferred.'))
        for target in refs(' '.join(cells[1:])):
            if target==rid:continue
            relation='evidenced_by' if target.startswith('CE') else 'monitored_by' if target.startswith('M') else 'carried_forward_by' if target.startswith('ER') else 'creates_pathway' if target.startswith('CP') else 'depends_on'
            links.append(dict(link_id=f'L-{rid}-{target}',from_record_id=rid,from_record_version='1',relation=relation,to_kind='evidence' if target.startswith('CE') else 'record',to_id=target,to_revision='' if target.startswith('CE') else '1',support_status='source_supported',link_rationale='Explicit identifier reference in supplied supplementary table; supports documentary linkage, not causal effectiveness.'))
write('records.csv',headers,records)
write('links.csv',next(csv.reader((ROOT/'traceability/links.csv').open())),links)
write('record-provenance.csv',list(provenance[0]),provenance)
print(f'Serialized {len(records)} records and {len(links)} source-explicit links.')
