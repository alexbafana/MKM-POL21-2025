const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../results');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'paperb-receipt-check-'));
try {
  fs.cpSync(root,temp,{recursive:true});
  const file=fs.readdirSync(path.join(temp,'local-store')).find(x=>x.endsWith('.receipt.json'));
  const filename=path.join(temp,'local-store',file);
  const receipt=JSON.parse(fs.readFileSync(filename,'utf8'));
  receipt.receiptHash='0x'+'00'.repeat(32);
  fs.writeFileSync(filename,JSON.stringify(receipt));
  const result=spawnSync(process.execPath,[path.join(__dirname,'verify-receipt.cjs')],{env:{...process.env,PAPER_B_VERIFY_RESULTS:temp},encoding:'utf8'});
  if(result.status===0 || !result.stderr.includes('Receipt digest mismatch')) throw new Error('Tampered receipt was not rejected');
  const report={passed:true,case:'Tampered receipt digest rejected',diagnostic:result.stderr.trim()};
  fs.writeFileSync(path.join(root,'receipt-negative-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} finally {fs.rmSync(temp,{recursive:true,force:true});}
