"""Independent dense NumPy/SciPy oracle for the restricted ICML2004 diagonal model.
No product imports; small fixtures deliberately use full objective recomputation.
"""
from pathlib import Path
import sys,json,platform,itertools
try: import scipy
except ImportError:
 sys.path.insert(0,str(Path('.local/spectral-reference-runtime').resolve()))
 import scipy
import numpy as np
from scipy.linalg import inv,cholesky
from scipy.optimize import approx_fprime
from scipy.optimize._numdiff import approx_derivative

def rng(seed):
 a=seed&0xffffffff
 while True:
  a=(a+0x6d2b79f5)&0xffffffff;t=((a^(a>>15))*(a|1))&0xffffffff
  t^=(t+(((t^(t>>7))*(t|61))&0xffffffff))&0xffffffff
  yield ((t^(t>>14))&0xffffffff)/4294967296

def closure(n,ml,cl):
 reach=np.eye(n,dtype=bool)
 for i,j in ml:reach[i,j]=reach[j,i]=True
 for h in range(n):reach|=reach[:,h,None]&reach[None,h,:]
 groups=[];seen=set()
 for i in range(n):
  if i not in seen:
   g=np.flatnonzero(reach[i]).tolist();groups.append(g);seen.update(g)
 m=[(i,j) for i in range(n) for j in range(i+1,n) if reach[i,j]];c=set()
 for i,j in cl:
  if reach[i,j]:raise ValueError('contradiction')
  for a in np.flatnonzero(reach[i]):
   for b in np.flatnonzero(reach[j]):c.add(tuple(sorted((int(a),int(b)))))
 return groups,m,sorted(c)

def diameter(x,a):
 pairs=list(itertools.combinations(range(len(x)),2))
 if not pairs:return 0.,[0,0],np.zeros(x.shape[1])
 ds=np.array([(x[i]-x[j])**2 for i,j in pairs]);vals=ds@a;h=int(vals.argmax())
 return float(vals[h]),list(pairs[h]),ds[h]

def cost(x,z,v,a,m,c,w):
 ds=float(sum((x[i]-v[h])@np.diag(a[h])@(x[i]-v[h]) for i,h in enumerate(z)))
 ld=float(sum(-np.linalg.slogdet(np.diag(a[h]))[1] for h in z))
 ml=float(sum(w*.5*((x[i]-x[j])@(np.diag(a[z[i]])+np.diag(a[z[j]]))@(x[i]-x[j])) for i,j in m if z[i]!=z[j]))
 diam=[diameter(x,aa) for aa in a]
 cl=float(sum(w*(diam[z[i]][0]-(x[i]-x[j])@np.diag(a[z[i]])@(x[i]-x[j])) for i,j in c if z[i]==z[j]))
 return dict(distanceCost=ds,logDetCost=ld,mustLinkCost=ml,cannotLinkCost=cl,objective=ds+ld+ml+cl,mustViolations=sum(z[i]!=z[j] for i,j in m),cannotViolations=sum(z[i]==z[j] for i,j in c))

def denominator(x,z,v,a,m,c,w):
 s=np.zeros_like(a);counts=np.bincount(z,minlength=len(a))
 for i,h in enumerate(z):s[h]+=(x[i]-v[h])**2
 for i,j in m:
  if z[i]!=z[j]:
   delta=(x[i]-x[j])**2;s[z[i]]+=w*.5*delta;s[z[j]]+=w*.5*delta
 for i,j in c:
  if z[i]==z[j]:s[z[i]]+=w*(diameter(x,a[z[i]])[2]-(x[i]-x[j])**2)
 return s,counts

def run(case):
 x=np.array(case['values'],float);n,d=x.shape;o=dict(k=2,seed=42,iterations=20,tolerance=1e-9,metricTolerance=1e-9,constraintPenalty=.01,metricConditioning=0);o.update(case.get('params',{}));k=o['k'];w=o['constraintPenalty'];stream=rng(o['seed'])
 groups,m,c=closure(n,case.get('mustLink',[]),case.get('cannotLink',[]));g=sorted([g for g in groups if len(g)>1],key=lambda g:(-len(g),g[0]));chosen=[]
 if g:
  chosen=[0]
  while len(chosen)<min(k,len(g)):
   candidates=[h for h in range(len(g)) if h not in chosen]
   chosen.append(max(candidates,key=lambda h:len(g[h])*min(float(np.sum((x[g[h]].mean(0)-x[g[j]].mean(0))**2)) for j in chosen)))
 v=[x[g[h]].mean(0) for h in chosen]
 while len(v)<k:v.append(x.mean(0)+np.array([(2*next(stream)-1)*.05*r for r in np.ptp(x,axis=0)]))
 v=np.array(v);a=np.ones((k,d));z=np.array([int(np.sum((v-row)**2,axis=1).argmin()) for row in x]);records=[];initial=dict(centroids=v.tolist(),labels=z.tolist(),metrics=a.tolist(),**cost(x,z,v,a,m,c,w));converged=False
 for it in range(1,o['iterations']+1):
  order=list(range(n))
  for j in range(n-1,0,-1):
   h=int(next(stream)*(j+1));order[j],order[h]=order[h],order[j]
  changed=0;assignments=[]
  for i in order:
   old=int(z[i]);totals=[]
   for h in range(k):
    zz=z.copy();zz[i]=h;totals.append(cost(x,zz,v,a,m,c,w)['objective'])
   best=old
   for h in range(k):
    if totals[h]<totals[best]-1e-12:best=h
   z[i]=best;changed+=best!=old;assignments.append(dict(current=i,chosen=best,labels=z.tolist(),globalCosts=totals))
  prev=v.copy();v=np.array([x[z==h].mean(0) if np.any(z==h) else v[h] for h in range(k)])
  s,counts=denominator(x,z,v,a,m,c,w);new=a.copy();conditioned=[]
  for h in range(k):
   if counts[h]==0:continue
   if np.any(s[h]<0) or not np.all(np.isfinite(s[h])):raise ValueError('negative-denominator')
   den=s[h].copy()
   if np.any(den==0):
    if o['metricConditioning']<=0 or den.sum()<=0:raise ValueError('singular-denominator')
    den+=o['metricConditioning']*den.sum();conditioned.append(h)
   new[h]=np.diag(inv(np.diag(den/counts[h])));cholesky(np.diag(new[h]))
  move=float(np.linalg.norm(v-prev,axis=1).max());metricMove=float(np.max(np.abs(np.log(new)-np.log(a))));a=new
  records.append(dict(iteration=it,order=order,assignments=assignments,centroids=v.tolist(),labels=z.tolist(),metrics=a.tolist(),denominators=s.tolist(),conditioned=conditioned,diameters=[dict(value=diameter(x,aa)[0],pair=diameter(x,aa)[1]) for aa in a],**cost(x,z,v,a,m,c,w)))
  if changed==0 and move<=o['tolerance'] and metricMove<=o['metricTolerance']:converged=True;break
 return dict(initial=initial,states=records,closedMustLink=m,closedCannotLink=c,centroids=v.tolist(),metrics=a.tolist(),labels=z.tolist(),iteration=it,converged=converged,**cost(x,z,v,a,m,c,w))

base=[[-3,-1],[-2.8,-.8],[-3.2,-1.1],[3,1],[2.8,.8],[3.2,1.1]]
cases=[dict(name='unconstrained',values=base),dict(name='natural-ml',values=base,mustLink=[[0,2],[3,5]]),dict(name='finite-ml-violation',values=base,mustLink=[[0,3],[1,2]]),dict(name='finite-cl-violation',values=base,cannotLink=[[0,1]]),dict(name='mixed',values=base,mustLink=[[0,2],[3,5]],cannotLink=[[0,1],[3,4]],params=dict(constraintPenalty=.005)),dict(name='scaled',values=[[x*.01,y*100] for x,y in base]),dict(name='nd-zero-xy-conditioned',values=[[0,0,x,y] for x,y in base],params=dict(metricConditioning=1e-6)),dict(name='duplicates',values=[[-1,-1],[-1,-1],[-.9,-1.2],[1,1],[1,1],[.9,1.2]]),dict(name='empty-tie',values=[[-1,-1],[1,1],[-1,1],[1,-1]],mustLink=[[0,1],[2,3]]),dict(name='closure-duplicates',values=base,mustLink=[[0,1],[1,2],[2,1],[3,4],[4,5]],cannotLink=[[0,3],[3,0]]),dict(name='seed-137',values=base,params=dict(seed=137)),dict(name='reversed-input',values=list(reversed(base)),params=dict(seed=137)),dict(name='limit',values=base,params=dict(iterations=1)),dict(name='singular-strict',values=[[0,1],[0,2],[0,4],[0,5]]),dict(name='constant',values=[[1,1],[1,1],[1,1]]),dict(name='negative-denominator',values=[[-2,0],[2,0],[0,-10],[0,10]],cannotLink=[[0,1]],params=dict(k=1,constraintPenalty=1)),dict(name='contradiction',values=base,mustLink=[[0,1]],cannotLink=[[1,0]])]
out=[]
for c in cases:
 try:result=run(c)
 except ValueError as e:result=dict(error=str(e))
 out.append(dict(input=c,result=result))
x=np.array([[-2,0],[2,1],[0,-3],[1,4]],float);z=np.array([0,1,1,0]);v=np.array([x[z==h].mean(0) for h in range(2)]);a=np.array([[2,.6],[.4,3]]);m=[(0,1)];c=[(0,3)];w=.2;s,counts=denominator(x,z,v,a,m,c,w)
def fun(flat):return cost(x,z,v,flat.reshape(a.shape),m,c,w)['objective']
forward=approx_fprime(a.ravel(),fun,1e-7).reshape(a.shape)
numeric=approx_derivative(fun,a.ravel(),method='3-point').reshape(a.shape);analytic=s-counts[:,None]/a
assert np.allclose(numeric,analytic,atol=2e-6)
proposal=counts[:,None]/s
gradient=dict(values=x.tolist(),labels=z.tolist(),centroids=v.tolist(),metrics=a.tolist(),mustLink=m,cannotLink=c,penalty=w,denominators=s.tolist(),analytic=analytic.tolist(),finiteDifference=numeric.tolist(),forwardDifference=forward.tolist(),proposal=proposal.tolist(),beforePairs=[diameter(x,aa)[1] for aa in a],afterPairs=[diameter(x,aa)[1] for aa in proposal])
enum=[dict(labels=list(zz),**cost(x,np.array(zz),v,a,m,c,w)) for zz in itertools.product(range(2),repeat=4)]
payload=dict(environment=dict(python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__,license='NumPy/SciPy BSD-3-Clause; independent verification only; no product code copied',authorSoftwareExecuted=False),gradient=gradient,enumeration=enum,cases=out)
Path('docs/research/mpck-reference.json').write_text(json.dumps(payload,indent=2,allow_nan=False,default=lambda v:v.item())+'\n',encoding='utf-8')
print('MPCK independent cases',len(out),'successful',sum('error' not in q['result'] for q in out),'SciPy finite differences passed')
