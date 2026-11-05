import subprocess, os, sys
tree, main, base = sys.argv[1], sys.argv[2], sys.argv[3]
out=[]
res=subprocess.run(["git","-C",main,"ls-tree","-r","-z",base,"--","src","test","docs"],capture_output=True)
if res.returncode!=0:
    print("GIT_LS_TREE_FAILED",res.returncode); print(res.stderr.decode('utf-8','replace')); sys.exit(2)
entries={}
for rec in res.stdout.split(b'\0'):
    if not rec: continue
    meta,path=rec.split(b'\t',1)
    mode,typ,h=meta.split()
    entries[path.decode()]=h.decode()
mismatch=[]; missing=[]; ok=0
for rel,h in sorted(entries.items()):
    p=os.path.join(tree,rel.replace('/',os.sep))
    if not os.path.exists(p): missing.append(rel); continue
    r=subprocess.run(["git","-C",main,"hash-object","--path="+rel,"--",p],capture_output=True,text=True)
    calc=r.stdout.strip()
    if calc!=h: mismatch.append((rel,h,calc,r.returncode))
    else: ok+=1
extras=[]
for root in ['src','test','docs']:
    for dirpath,dirnames,filenames in os.walk(os.path.join(tree,root)):
        for fn in filenames:
            rel=os.path.relpath(os.path.join(dirpath,fn),tree).replace(os.sep,'/')
            if rel not in entries and not rel.startswith('docs/evidence/W10-B/'):
                extras.append(rel)
out.append('BASELINE_COMMIT='+base)
out.append('BASELINE_TRACKED_FILES(src,test,docs)='+str(len(entries)))
out.append('MATCH='+str(ok))
out.append('MISMATCH='+str(len(mismatch)))
for rel,h,c,rc in mismatch: out.append('MISMATCH_FILE='+rel+' expected='+h+' actual='+c+' hashobj_exit='+str(rc))
out.append('MISSING='+str(len(missing)))
for x in missing: out.append('MISSING_FILE='+x)
out.append('EXTRA_OUTSIDE_W10B='+str(len(extras)))
for x in sorted(extras): out.append('EXTRA_FILE='+x)
out.append('JUDGMENT='+('PASS' if not mismatch and not missing and not extras else 'FAIL'))
txt='\n'.join(out)+'\n'
open(os.path.join(tree,'docs','evidence','W10-B','runs','isolation-check.txt'),'w',encoding='utf-8',newline='\n').write(txt)
print(txt)
