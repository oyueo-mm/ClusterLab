"""Independent COP oracle: explicit Floyd closure, full candidate relation scan and
exhaustive K**n label enumeration on small fixtures. Verification only; no TS import.
"""
from pathlib import Path
from itertools import product
import json
import sys
import math

runtime=Path(__file__).resolve().parents[1]/'.local/spectral-reference-runtime'
if runtime.exists():sys.path.insert(0,str(runtime))
import numpy as np

def stream(seed):
    a=seed & 0xffffffff
    while True:
        a=(a+0x6d2b79f5)&0xffffffff
        t=((a^(a>>15))*(1|a))&0xffffffff
        t=(t+(((t^(t>>7))*(61|t))&0xffffffff))&0xffffffff ^ t
        yield ((t^(t>>14))&0xffffffff)/4294967296

def initialize(x,k,seed):
    rng=stream(seed);chosen=[int(next(rng)*len(x))]
    while len(chosen)<k:
        nearest=np.min(np.sum((x[:,None,:]-x[chosen][None,:,:])**2,axis=2),axis=1)
        nearest[chosen]=0
        scale=float(np.max(nearest))
        nxt=-1
        if scale:
            u=next(rng)*sum(float(v)/scale for v in nearest)
            for i,w in enumerate(nearest):
                if i in chosen:continue
                u-=float(w)/scale
                if u<0:nxt=i;break
        if nxt<0:nxt=next(i for i in range(len(x)) if i not in chosen)
        chosen.append(nxt)
    return chosen

def exhaustive(x,k,ml,cl):
    valid=[]
    for labels in product(range(k),repeat=len(x)):
        if any(labels[a]!=labels[b] for a,b in ml) or any(labels[a]==labels[b] for a,b in cl):continue
        cost=0
        for c in range(k):
            group=x[np.asarray(labels)==c]
            if len(group):cost+=float(np.sum((group-np.mean(group,axis=0))**2))
        valid.append({'labels':list(labels),'sse':cost})
    return valid

def reference(values,k,seed,ml,cl,iterations=10,tolerance=1e-9):
    x=np.asarray(values,dtype=float);n=len(x)
    reach=np.eye(n,dtype=bool)
    for a,b in ml:reach[a,b]=reach[b,a]=True
    for h in range(n):reach|=reach[:,h,None]&reach[None,h,:]
    inherited=np.zeros((n,n),dtype=bool)
    for a,b in cl:
        for i in range(n):
            for j in range(n):
                if reach[i,a] and reach[j,b] or reach[i,b] and reach[j,a]:inherited[i,j]=True
    initial=initialize(x,k,seed);centers=x[initial].copy();old=[-2]*n;states=[];failed=False;reason='iteration-limit'
    for iteration in range(1,iterations+1):
        labels=[-2]*n
        for i in range(n):
            candidates=[];chosen=None
            for c in sorted(range(k),key=lambda c:(float(np.sum((x[i]-centers[c])**2)),c)):
                allowed=all(labels[j]<0 or not ((reach[i,j] and labels[j]!=c) or (inherited[i,j] and labels[j]==c)) for j in range(n))
                candidates.append({'cluster':c,'distanceSquared':float(np.sum((x[i]-centers[c])**2)),'allowed':allowed})
                if allowed:chosen=c;break
            states.append({'phase':'test-row','iteration':iteration,'row':i,'labels':labels.copy(),'candidates':candidates})
            if chosen is None:failed=True;reason='greedy-failure';break
            labels[i]=chosen
        if failed:break
        nxt=np.asarray([np.mean(x[np.asarray(labels)==c],axis=0) if c in labels else centers[c] for c in range(k)])
        movement=float(np.max(np.linalg.norm(nxt-centers,axis=1)))
        centers=nxt
        cost=float(sum(np.sum((row-centers[c])**2) for row,c in zip(x,labels)))
        states.append({'phase':'move','iteration':iteration,'labels':labels.copy(),'centroids':centers.tolist(),'objective':cost,'movement':movement})
        if labels==old:reason='labels-stable';break
        if movement<=tolerance:reason='center-tolerance';break
        old=labels.copy()
    return {'values':values,'k':k,'seed':seed,'mustLink':ml,'cannotLink':cl,'iterations':iterations,'tolerance':tolerance,'initialization':initial,'states':states,'failed':failed,'stopReason':reason,'feasible':exhaustive(x,k,ml,cl)}

cases=[
 reference([[0,0,0],[0,0,.1],[0,0,3],[0,0,3.1]],2,42,[[0,1]],[[1,2]]),
 reference([[0],[10],[0],[10]],2,8,[[0,1]],[]),
 reference([[0],[.05],[3],[3.05]],2,42,[],[[0,2],[2,3],[3,1]]),
 reference([[0],[1],[2]],2,42,[],[[0,1],[1,2],[0,2]]),
 reference([[0],[0],[0]],3,7,[],[[0,1],[1,2],[0,2]]),
 reference([[0],[.2],[.4],[.6],[2]],2,19,[[0,1],[1,2]],[[2,4]]),
 reference([[1,2,3]],1,42,[],[]),
 reference([[0],[2],[3],[5]],2,42,[[0,3]],[[0,1],[0,2]]),
]
out={'oracle':f'NumPy {np.__version__}; explicit pair closure/full relation scan; small exhaustive K**n feasibility and SSE (not proof of greedy global optimum)','cases':cases}
target=Path(__file__).resolve().parents[1]/'src/engine/fixtures/constrained-reference.json'
target.write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(f'{len(cases)} cases; {sum(len(c["feasible"]) for c in cases)} exhaustive feasible labeled partitions; NumPy {np.__version__}')
