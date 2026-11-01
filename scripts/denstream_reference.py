"""Independent small DenStream oracle: retain observations, recompute moments
from exponential weights, not incremental CF updates. Verification only."""
from pathlib import Path
import json
import math
import sys

runtime = Path(__file__).resolve().parents[1] / '.local/spectral-reference-runtime'
if runtime.exists(): sys.path.insert(0, str(runtime))
import numpy as np

def run(samples, epsilon=.1, beta=.6, mu=3, rate=.05):
    interval = math.ceil(math.log2(beta*mu/(beta*mu-1))/rate)
    groups, next_id, next_prune, records = [], 0, None, []
    def stats(group, time):
        rows=np.asarray([x for _,x in group['observations']],dtype=float)
        weights=np.exp2(-rate*(time-np.asarray([t for t,_ in group['observations']])))
        shifted=rows-rows[0]
        weight=float(weights.sum())
        if weight == 0: return weight, rows[0], 0.
        mean=np.average(shifted,axis=0,weights=weights)
        var=float(np.average(np.sum((shifted-mean)**2,axis=1),weights=weights))
        return weight, rows[0]+mean, math.sqrt(max(0,var))
    def prune(time):
        nonlocal groups
        groups=[g for g in groups if stats(g,time)[0] >= (beta*mu if g['potential'] else math.expm1(-rate*(time-g['created']+interval)*math.log(2))/math.expm1(-rate*interval*math.log(2)))]
    for time, point in samples:
        if next_prune is None: next_prune=time+interval
        while next_prune < time:
            prune(next_prune); next_prune+=interval
        chosen=None
        for potential in [True,False]:
            eligible=[g for g in groups if g['potential']==potential]
            if not eligible: continue
            nearest=min(eligible,key=lambda g: float(np.linalg.norm(np.asarray(point)-stats(g,time)[1])))
            proposal={**nearest,'observations':nearest['observations']+[(time,point)]}
            weight,_,r=stats(proposal,time)
            if r <= epsilon:
                nearest['observations']=proposal['observations']
                if weight > beta*mu: nearest['potential']=True
                chosen=nearest
                break
        if chosen is None:
            chosen={'id':next_id,'created':time,'potential':False,'observations':[(time,point)]}
            groups.append(chosen);next_id+=1
        if next_prune == time: prune(time); next_prune+=interval
        snapshot=[]
        for g in groups:
            w,c,r=stats(g,time)
            snapshot.append({'id':g['id'],'weight':w,'center':c.tolist(),'radius':r,'potential':g['potential']})
        records.append({'time':time,'assigned':chosen['id'],'micro':snapshot})
    return {'samples':[{'time':t,'values':x} for t,x in samples],'epsilon':epsilon,'beta':beta,'minWeight':mu,'decayRate':rate,'pruneInterval':interval,'states':records}

cases=[run([(i,[x,y]) for i,(x,y) in enumerate([(0,0),(.1,0),(0,.1),(.05,.05),(1,1),(1.1,1),(1,1.1),(1.05,1.05)])]+[(80,[2,2]),(81,[2.1,2]),(82,[2,2.1]),(83,[2.05,2.05])]),run([(i,[1e12+x,1e12+y]) for i,(x,y) in enumerate([(0,0),(.125,0),(0,.125),(.125,.125)])],epsilon=.2),run([(i,[0,0,float(i%2)*5]) for i in range(12)],epsilon=.1)]
out={'oracle':f'Independent observation-weight recomputation / NumPy {np.__version__}', 'cases':cases}
target=Path(__file__).resolve().parents[1]/'src/engine/fixtures/denstream-reference.json'
target.write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(f'Wrote {target.name}; {len(cases)} cases; NumPy {np.__version__}')
