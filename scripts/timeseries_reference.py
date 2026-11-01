"""Independent NumPy/SciPy implementation of zero-padded SBD and k-Shape kernels.
No product algorithm module is invoked. Random stream matches only the seed contract.
"""
from pathlib import Path
import sys,json,math
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.local/spectral-reference-runtime'))
import numpy as np
import scipy
from scipy.signal import correlate

def zn(x):
 a=np.asarray(x,dtype=float);std=np.std(a)
 return np.zeros_like(a) if std==0 else (a-np.mean(a))/std
def sbd(ref,row):
 ref=np.asarray(ref);row=np.asarray(row);nr=np.linalg.norm(ref);ny=np.linalg.norm(row);length=len(ref)
 if nr==0 or ny==0:return {'distance':float(0 if nr==0 and ny==0 else 1),'shift':0,'correlation':np.zeros(2*length-1),'aligned':row.copy()}
 coeff=correlate(ref,row,mode='full',method='direct')/(nr*ny);index=int(np.argmax(coeff));shift=index-length+1
 shifted=np.zeros_like(row)
 if shift>=0:shifted[shift:]=row[:length-shift]
 else:shifted[:length+shift]=row[-shift:]
 return {'distance':float(1-coeff[index]),'shift':shift,'correlation':coeff,'aligned':shifted}
def shape(rows,reference):
 rows=np.asarray(rows);m=rows.shape[1]
 aligned=np.array([sbd(reference,row)['aligned'] if np.linalg.norm(reference)>0 else row.copy() for row in rows]);Q=np.eye(m)-np.ones((m,m))/m
 M=Q.T@aligned.T@aligned@Q
 if np.allclose(M,0,atol=0):return {'centroid':np.zeros(m),'eigenvalues':np.zeros(m),'matrix':M,'aligned':aligned}
 eigenvalues,eigenvectors=np.linalg.eigh(M);positive=zn(eigenvectors[:,-1]);negative=-positive
 objective=lambda c:sum(sbd(c,row)['distance']**2 for row in rows)
 result=negative if objective(negative)<objective(positive) else positive
 return {'centroid':result,'eigenvalues':eigenvalues,'matrix':M,'aligned':aligned}
class Seed:
 def __init__(self,seed):self.a=seed&0xffffffff
 def next(self):
  self.a=(self.a+0x6d2b79f5)&0xffffffff;t=self.a
  t=((t^(t>>15))*(t|1))&0xffffffff
  t^=(t+(((t^(t>>7))*(t|61))&0xffffffff))&0xffffffff
  return ((t^(t>>14))&0xffffffff)/4294967296
def cluster(values,k,seed=42,iterations=20):
 rows=np.array([zn(row) for row in values]);n,m=rows.shape;state=Seed(seed);order=list(range(n))
 for j in range(n-1,0,-1):
  i=math.floor(state.next()*(j+1));order[i],order[j]=order[j],order[i]
 labels=np.zeros(n,dtype=int)
 for j,index in enumerate(order):labels[index]=j if j<k else math.floor(state.next()*k)
 initial=labels.copy();centroids=np.zeros((k,m));objectives=[]
 for iteration in range(iterations):
  previous=labels.copy()
  for j in range(k):
   if np.any(labels==j):centroids[j]=shape(rows[labels==j],centroids[j])['centroid']
  distances=np.array([[sbd(c,row)['distance'] for c in centroids] for row in rows]);labels=np.argmin(distances,axis=1)
  objective=float(np.sum(distances[np.arange(n),labels]**2));objectives.append(objective)
  if np.array_equal(labels,previous):break
 return {'values':np.asarray(values).tolist(),'k':k,'seed':seed,'initial':initial.tolist(),'labels':labels.tolist(),'centroids':centroids.tolist(),'objectives':objectives}

rng=np.random.default_rng(443)
baseA=np.array([-1.,-1.,0.,2.,3.,1.,0.,-1.,-1.,-1.]);baseB=np.array([-1.,1.,-1.,1.,-1.,1.,-1.,1.,-1.,1.])
values=[]
for i in range(12):
 base=baseA if i<6 else baseB
 row=np.roll(base,i%3-1)+rng.normal(0,.015,len(base));values.append((row*(1+i*.2)+i*2).tolist())
pairs=[]
for ref,row in [(values[0],values[1]),(values[0],values[6]),([0,1,2,3],[0,0,0,0]),([0,0,0,0],[2,2,2,2])]:
 a=zn(ref);b=zn(row);r=sbd(a,b);pairs.append({'reference':a.tolist(),'sequence':b.tolist(),**{key:value.tolist() if isinstance(value,np.ndarray) else value for key,value in r.items()}})
selected=np.array([zn(values[i]) for i in [0,1,2]])
reference=selected[0];extracted=shape(selected,reference)
fixture={'versions':{'numpy':np.__version__,'scipy':scipy.__version__},'note':'Independent NumPy linear algebra and SciPy direct correlation; population std ddof0. Sign chosen by actual squared SBD objective.','pairs':pairs,'shape':{'rows':selected.tolist(),'reference':reference.tolist(),**{key:value.tolist() for key,value in extracted.items()}},'clustering':[cluster(values,2),cluster([values[0],values[1],values[2]],1)]}
(root/'src/engine/fixtures/timeseries-reference.json').write_text(json.dumps(fixture,indent=2)+'\n',encoding='utf-8')
print('Wrote timeseries-reference.json',fixture['versions'],'clusters',fixture['clustering'][0]['labels'])
