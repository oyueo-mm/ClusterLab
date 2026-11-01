"""Independent SciPy/NumPy/diptest numerical oracles; none is a product dependency."""
from pathlib import Path
import sys,json,math,itertools
root=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(root/'.local/spectral-reference-runtime'),str(root/'.local/auto-reference-runtime')]
import numpy as np
import scipy
from scipy.special import log_ndtr
import diptest

rng=np.random.default_rng(2468)
dip_vectors=[np.array([0.,0.,1.,1.]),np.arange(8,dtype=float),np.zeros(8),np.array([0.,0.,0.,1.,1.,1.]),np.array([0.,1.,2.])]
for n in [4,5,6,8,12,20,50,100]:
 for j in range(12):
  a=rng.normal(size=n)
  if j%3==0:a=np.round(a,1)
  if j%4==0:a[n//2:]+=8
  dip_vectors.append(a)
# Exhaustive discrete/tied patterns detect envelope/ECDF boundary errors.
for n in range(4,9):
 for combo in itertools.combinations_with_replacement([0.,1.,2.,3.],n):
  dip_vectors.append(np.array(combo))
for factor in [1e-150,1e150]:
 for base in [np.arange(8,dtype=float),np.array([0,0,1,1.,5,7])]:
  dip_vectors.append(base*factor)
dip_cases=[{'values':v.tolist(),'dip':float(diptest.dipstat(np.sort(v),allow_zero=True)) if len(v)>=4 else 0.} for v in dip_vectors]
def ad(a):
 z=np.sort((a-np.mean(a))/np.std(a,ddof=1));n=len(a)
 raw=-n-np.sum((2*np.arange(1,n+1)-1)*(log_ndtr(z)+log_ndtr(-z[::-1])))/n
 return {'values':a.tolist(),'standardized':z.tolist(),'statistic':float(raw*(1+4/n-25/n**2))}
ad_cases=[ad(rng.normal(size=n)) for n in [8,12,50,100]]
ad_cases +=[ad(np.r_[rng.normal(-3,.1,20),rng.normal(3,.1,20)])]
x=np.array([[0,0,0],[0,0,.1],[0,0,.2],[0,0,2],[0,0,2.1],[0,0,2.2]],dtype=float)
def bic(centers,labels):
 k=len(centers);n,d=x.shape
 count=np.bincount(labels,minlength=k)
 sse=np.sum((x-np.array(centers)[labels])**2);var=sse/(n-k)
 ll=sum(v*math.log(v/n)-v/2*math.log(2*math.pi)-v*d/2*math.log(var)-(v-k)/2 for v in count)
 return float(ll-k*(d+1)/2*math.log(n))
single=np.mean(x,axis=0)[None,:];pair=np.array([[0,0,.1],[0,0,2.1]])
def dp(data,penalty):
 centers=[np.mean(data,axis=0)]; labels=np.zeros(len(data),int);objectives=[]
 for iteration in range(20):
  old=labels.copy();created=False
  for i,row in enumerate(data):
   costs=np.sum((centers-row)**2,axis=1); j=int(np.argmin(costs))
   if costs[j]>penalty:centers.append(row.copy());j=len(centers)-1;created=True
   labels[i]=j
  unique=np.unique(labels);labels=np.searchsorted(unique,labels)
  centers=[np.mean(data[labels==j],axis=0) for j in range(len(unique))]
  sse=float(np.sum((data-np.array(centers)[labels])**2));objectives.append(sse+penalty*len(centers))
  if not created and np.array_equal(old,labels):break
 return {'values':data.tolist(),'penalty':penalty,'centroids':np.array(centers).tolist(),'labels':labels.tolist(),'objectives':objectives,'sse':sse}
record={'versions':{'numpy':np.__version__,'scipy':scipy.__version__,'diptest':diptest.__version__},'note':'diptest GPL3 verification-only isolated package. Product hull algorithm independently written; no package code bundled.','dip':dip_cases,'ad':ad_cases,'logCDF':[{'z':z,'value':float(log_ndtr(z))} for z in [-1e6,-100,-40,-10,-2,-1,-.5,0,.5,1,2,10,100,1e6]],'bic':{'values':x.tolist(),'single':bic(single,np.zeros(6,int)),'pair':bic(pair,np.array([0,0,0,1,1,1]))},'dp':[dp(x,.2),dp(np.array([[0.,0.],[.1,0],[.2,0],[.8,0],[.9,0],[1.,0]]),.08)]}
target=root/'src/engine/fixtures/auto-models-reference.json';target.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Wrote',target.name,record['versions'],len(dip_cases),'dip fixtures')
