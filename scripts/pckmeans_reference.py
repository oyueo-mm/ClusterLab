"""Independent NumPy oracle: Floyd closure, global J for every label replacement.
Verification only. Does not import the TypeScript engine or its sparse histograms.
"""
from pathlib import Path
from itertools import product
import json, platform
import numpy as np

def stream(seed):
    a=seed & 0xffffffff
    while True:
        a=(a+0x6d2b79f5)&0xffffffff
        t=((a^(a>>15))*(1|a))&0xffffffff
        t=(t+(((t^(t>>7))*(61|t))&0xffffffff))&0xffffffff ^ t
        yield ((t^(t>>14))&0xffffffff)/4294967296

def relations(n,ml,cl):
    reach=np.eye(n,dtype=bool)
    for a,b in ml: reach[a,b]=reach[b,a]=True
    for h in range(n): reach |= reach[:,h,None]&reach[None,h,:]
    m=[(i,j) for i in range(n) for j in range(i+1,n) if reach[i,j]]
    c=[(i,j) for i in range(n) for j in range(i+1,n) if any((reach[i,a] and reach[j,b]) or (reach[i,b] and reach[j,a]) for a,b in cl)]
    if any(reach[a,b] for a,b in cl): raise ValueError('inconsistent supervision')
    groups=[]; seen=set()
    for i in range(n):
        if i not in seen:
            g=list(np.flatnonzero(reach[i]));seen.update(g)
            if len(g)>1:groups.append(g)
    groups.sort(key=lambda g:(-len(g),g[0]))
    return m,c,groups

def cost(x,v,z,m,c,w):
    distance=float(np.sum((x-v[np.asarray(z)])**2))
    mv=sum(z[a]!=z[b] for a,b in m);cv=sum(z[a]==z[b] for a,b in c)
    return dict(distanceCost=distance,mustLinkCost=w*mv,cannotLinkCost=w*cv,objective=distance+w*(mv+cv),mustViolations=int(mv),cannotViolations=int(cv))

def run(case):
    x=np.asarray(case['values'],dtype=float);n,d=x.shape;k=case['k'];w=case['penalty']
    m,c,groups=relations(n,case['mustLink'],case['cannotLink']);rng=stream(case['seed'])
    v=[np.mean(x[g],axis=0) for g in groups[:k]]
    covered=set(i for g in groups for i in g)
    if len(v)<k and groups:
        extra=next((i for i in range(n) if i not in covered and all(any((min(i,j),max(i,j)) in c for j in g) for g in groups)),None)
        if extra is not None:v.append(x[extra].copy())
    global_mean=np.mean(x,axis=0);span=np.ptp(x,axis=0)
    while len(v)<k:v.append(np.array([global_mean[j]+(2*next(rng)-1)*.05*span[j] for j in range(d)]))
    v=np.asarray(v);initial=v.copy().tolist();z=np.argmin(np.sum((x[:,None,:]-v[None,:,:])**2,axis=2),axis=1).tolist()
    states=[];initial_cost=cost(x,v,z,m,c,w)
    for iteration in range(1,case.get('iterations',20)+1):
        before=cost(x,v,z,m,c,w)['objective'];order=list(range(n));changed=0
        for j in range(n-1,0,-1):
            h=int(next(rng)*(j+1));order[j],order[h]=order[h],order[j]
        for i in order:
            old=z[i];candidate=[]
            for h in range(k):
                test=z.copy();test[i]=h;global_cost=cost(x,v,test,m,c,w)
                dist=float(np.sum((x[i]-v[h])**2))
                ml_cost=w*sum(test[a]!=test[b] for a,b in m if i in (a,b))
                cl_cost=w*sum(test[a]==test[b] for a,b in c if i in (a,b))
                candidate.append(dict(cluster=h,distanceSquared=dist,mustLinkCost=ml_cost,cannotLinkCost=cl_cost,total=dist+ml_cost+cl_cost,globalObjective=global_cost['objective']))
            chosen=old
            for h in range(k):
                if candidate[h]['total']<candidate[chosen]['total']:chosen=h
            states.append(dict(iteration=iteration,row=i,labels=z.copy(),candidates=candidate,chosen=chosen))
            z[i]=chosen;changed+=chosen!=old
        nxt=np.asarray([np.mean(x[np.asarray(z)==h],axis=0) if h in z else v[h] for h in range(k)])
        movement=float(np.max(np.sum((nxt-v)**2,axis=1)));v=nxt
        result=cost(x,v,z,m,c,w)
        if not changed and movement==0:reason='labels-stable';break
        if abs(before-result['objective'])<=case.get('tolerance',1e-9):reason='objective-tolerance';break
    else:reason='iteration-limit'
    exhaustive=[]
    if n<=7:
        for labels in product(range(k),repeat=n):
            centers=np.asarray([np.mean(x[np.asarray(labels)==h],axis=0) if h in labels else v[h] for h in range(k)])
            exhaustive.append(dict(labels=list(labels),**cost(x,centers,labels,m,c,w)))
    return dict(initialCenters=initial,initialCost=initial_cost,labels=z,centroids=v.tolist(),closureMustLink=m,closureCannotLink=c,states=states,stopReason=reason,**result,exhaustive=exhaustive)

cases=[
 dict(name='nd-closure',values=[[0,0,0],[0,0,1],[0,0,4],[0,0,5]],mustLink=[[0,1],[1,0]],cannotLink=[[1,2]],k=2,penalty=2,seed=42),
 dict(name='accept-violation',values=[[0],[.1],[4],[4.1]],mustLink=[[0,3]],cannotLink=[[0,1]],k=2,penalty=.01,seed=42),
 dict(name='high-penalty',values=[[0],[.1],[4],[4.1]],mustLink=[[0,3]],cannotLink=[[0,1]],k=2,penalty=30,seed=42),
 dict(name='duplicates-empty',values=[[2,2],[2,2],[2,2]],mustLink=[],cannotLink=[[0,1]],k=3,penalty=1,seed=42),
 dict(name='zero-penalty',values=[[0],[2],[8],[10]],mustLink=[[0,3]],cannotLink=[[1,2]],k=2,penalty=0,seed=137),
 dict(name='ml-chain',values=[[0],[1],[2],[7],[8]],mustLink=[[0,1],[1,2]],cannotLink=[[2,3],[3,4]],k=2,penalty=1,seed=7),
 dict(name='no-supervision',values=[[0,2],[1,3],[8,4],[9,5]],mustLink=[],cannotLink=[],k=2,penalty=1,seed=42),
 dict(name='single',values=[[3]],mustLink=[[0,0]],cannotLink=[],k=1,penalty=1,seed=42),
]
results=[dict(input=c,result=run(c)) for c in cases]
Path('docs/research/pckmeans-reference.json').write_text(json.dumps(dict(environment=dict(python=platform.python_version(),numpy=np.__version__,license='NumPy BSD-3-Clause; verification only',officialImplementationExecuted=False),cases=results),indent=2),encoding='utf-8')
print('Independent PCKMeans fixtures:',len(results),'; exhaustive partitions:',sum(len(r['result']['exhaustive']) for r in results))
