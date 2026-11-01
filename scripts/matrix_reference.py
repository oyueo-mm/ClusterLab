"""Independent exhaustive binary rectangles and NumPy residue arithmetic oracle."""
from pathlib import Path
import itertools
import json
import sys
runtime=Path(__file__).resolve().parents[1]/'.local/spectral-reference-runtime'
if runtime.exists():sys.path.insert(0,str(runtime))
import numpy as np

def biclusters(a):
 n,m=a.shape;result=[]
 for rmask in range(1,1<<n):
  rows=[i for i in range(n) if rmask>>i&1]
  for cmask in range(1,1<<m):
   cols=[j for j in range(m) if cmask>>j&1]
   if not np.all(a[np.ix_(rows,cols)]==1):continue
   if any(i not in rows and np.all(a[i,cols]==1) for i in range(n)):continue
   if any(j not in cols and np.all(a[rows,j]==1) for j in range(m)):continue
   result.append({'rows':rows,'columns':cols})
 return result

binary_cases=[]
for mask in range(1<<9):
 a=np.array([(mask>>bit)&1 for bit in range(9)]).reshape(3,3)
 binary_cases.append({'matrix':a.tolist(),'expected':biclusters(a)})
rng=np.random.default_rng(119)
for _ in range(40):
 a=(rng.random((4,4))>.5).astype(int)
 binary_cases.append({'matrix':a.tolist(),'expected':biclusters(a)})

def stats(a,rows,cols,signs=None):
 b=a[np.ix_(rows,cols)].astype(float)
 if signs is not None:b=b*np.asarray(signs)[rows,None]
 rm=b.mean(axis=1);cm=b.mean(axis=0);gm=float(b.mean())
 residual=b-rm[:,None]-cm[None,:]+gm
 return {'residue':float(np.mean(residual**2)),'rowMeans':rm.tolist(),'columnMeans':cm.tolist(),'grandMean':gm,'rowResidues':np.mean(residual**2,axis=1).tolist(),'columnResidues':np.mean(residual**2,axis=0).tolist()}

matrix=np.array([[1.,2.,3.,7.],[2.,3.,4.,11.],[3.,4.,5.,6.],[9.,1.,7.,2.]])
delta=.01
rows=list(range(len(matrix)));cols=list(range(matrix.shape[1]));deletions=[]
while stats(matrix,rows,cols)['residue']>delta:
 s=stats(matrix,rows,cols)
 ri=int(np.argmax(s['rowResidues'])) if len(rows)>1 else None
 cj=int(np.argmax(s['columnResidues'])) if len(cols)>1 else None
 if ri is not None and (cj is None or s['rowResidues'][ri]>=s['columnResidues'][cj]):
  deletions.append({'axis':'row','index':rows[ri]});rows.pop(ri)
 else:deletions.append({'axis':'column','index':cols[cj]});cols.pop(cj)
subsets={}
for rm in range(1,1<<len(matrix)):
 rr=[i for i in range(len(matrix)) if rm>>i&1]
 for cm in range(1,1<<matrix.shape[1]):
  cc=[j for j in range(matrix.shape[1]) if cm>>j&1]
  subsets[f'{",".join(map(str,rr))}|{",".join(map(str,cc))}']=stats(matrix,rr,cc)
inverse=np.array([[1.,2.,3.],[2.,3.,4.],[-1.,-2.,-3.]])
out={'provenance':{'numpy':np.__version__,'method':'All nonempty row/column subsets for all 512 binary3x3 and40 binary4x4 matrices; NumPy double-centering for every225 nonempty submatrix of a4x4 input. No product algorithm code used.'},'bimaxCases':binary_cases,'cc':{'matrix':matrix.tolist(),'threshold':delta,'deletions':deletions,'rows':rows,'columns':cols,'result':stats(matrix,rows,cols),'subsets':subsets},'inverse':{'matrix':inverse.tolist(),'signs':[1,1,-1],'signed':stats(inverse,[0,1,2],[0,1,2],[1,1,-1]),'unsigned':stats(inverse,[0,1,2],[0,1,2])}}
target=Path(__file__).resolve().parents[1]/'src/engine/fixtures/matrix-reference.json'
target.write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(f'Wrote matrix-reference.json numpy={np.__version__}, exact binary cases={len(binary_cases)}, CC deletions={deletions}, final MSR={out["cc"]["result"]["residue"]}')
