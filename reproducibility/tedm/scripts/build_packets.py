"""Build answer-separated evaluation packets; no participant data."""
from pathlib import Path
import csv,io,zipfile
R=Path(__file__).resolve().parents[1];P=R/'protocol';O=R/'results/packets';O.mkdir(exist_ok=True)
guide=(P/'participant-materials/method-guides.md').read_text().split('## Revised TEDM condition\n',1)[1].split('Administration qualification:',1)[0]
for case in 'AB':
 for method in ['original','revised']:
  with zipfile.ZipFile(O/f'case-{case}-{method}.zip','w',zipfile.ZIP_DEFLATED) as z:
   z.write(P/f'participant-materials/case-{case}.md','case.md')
   z.write(P/'comparative-task-sheet.md','tasks.md')
   z.write(P/'participant-materials/response-form.csv','response-form.csv')
   if method=='original':z.write(P/'participant-materials/original-TEDM.pdf','method.pdf')
   else:z.writestr('method.md','# Revised TEDM study guide\n\n'+guide)
selected={'CG4','IN3','AR3','TP3','TP4','CP1','CP2','CP6','M1','M5','M6','ER4'}
rows=list(csv.DictReader((R/'traceability/records.csv').open()));out=io.StringIO();w=csv.DictWriter(out,fieldnames=list(rows[0]));w.writeheader();w.writerows(r for r in rows if r['record_id'] in selected)
with zipfile.ZipFile(O/'independent-reconstruction.zip','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('source-records.csv',out.getvalue())
 z.write(P/'independent-reconstruction.md','task.md')
 for s in (R/'schemas').glob('*'):z.write(s,'schemas/'+s.name)
 z.writestr('README.md','Source records are author-proposed documentary inputs. Reconstruct model semantics and record missing/ambiguous facts. No author-built model or destination answer is supplied. Request published notation documentation from facilitator if needed and record assistance. Models and observations remain distinct.\n')
print('Built four case/method packets and one answer-separated reconstruction packet.')
