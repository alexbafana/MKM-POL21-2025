"""Summarize submitted descriptive evidence; never infer missing scores/outcomes."""
import csv,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
files=['expert-review.csv','requirement-review.csv','participant-results.csv','reconstruction-results.csv']
result={'scope':'Completeness inventory only; populated rows still need human adjudication','forms':{}}
for name in files:
 rows=list(csv.DictReader((R/'protocol'/name).open()))
 result['forms'][name]={'submitted_rows':len(rows),'status':'pending' if not rows else 'requires assessment','blank_cells':sum(not str(v or '').strip() for row in rows for v in row.values())}
(R/'results/human-evidence-status.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
