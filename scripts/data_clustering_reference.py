"""Independent arithmetic oracle: no product implementation or library source is copied."""
from pathlib import Path
import itertools
import json
import sys

runtime = Path(__file__).resolve().parents[1] / '.local/spectral-reference-runtime'
if runtime.exists():
    sys.path.insert(0, str(runtime))
import numpy as np

root = Path(__file__).resolve().parents[1]
categorical = np.array([
    ['red', 'circle', 'warm'], ['red', 'circle', 'warm'], ['red', 'square', 'warm'],
    ['blue', 'square', 'cold'], ['blue', 'square', 'cold']
])
numeric = np.array([[0.,0.],[.1,0.],[.2,0.],[10.,1.],[10.1,1.]])
labels = np.array([0,0,0,1,1])
def modes(rows):
    return [str(values[np.argmax(counts)]) for values, counts in
            (np.unique(rows[:,j], return_counts=True) for j in range(rows.shape[1]))]
centers = [modes(categorical[labels==c]) for c in range(2)]
means = np.stack([numeric[labels==c].mean(axis=0) for c in range(2)])
categorical_cost = sum(np.count_nonzero(categorical[i] != centers[c]) for i,c in enumerate(labels))
mixed_cost = sum(float(np.sum((numeric[i]-means[c])**2)) + np.count_nonzero(categorical[i]!=centers[c]) for i,c in enumerate(labels))

rows = np.array([
    [.05,.04,.8,0.],[.1,.12,.9,.3],[.15,.17,.8,.6],
    [.8,.74,.05,0.],[.85,.86,.1,.3],[.9,.97,.15,.6]
])
grid=3; threshold=.3; max_dimension=2
lo=rows.min(axis=0); hi=rows.max(axis=0)
bins=np.minimum(grid-1,np.floor((rows-lo)/(hi-lo)*grid)).astype(int)
dense=[]; components=[]
for order in range(1,max_dimension+1):
    for dims in itertools.combinations(range(rows.shape[1]),order):
        occupied={tuple(binrow[list(dims)]) for binrow in bins}
        units={cell:np.flatnonzero(np.all(bins[:,dims]==cell,axis=1)).tolist()
               for cell in occupied}
        units={cell:members for cell,members in units.items() if len(members)/len(rows)>threshold}
        for cell,members in sorted(units.items()):
            dense.append({'dimensions':list(dims),'coordinates':list(map(int,cell)), 'members':members,'count':len(members)})
        remaining=set(units)
        while remaining:
            todo=[min(remaining)]; remaining.remove(todo[0]); comp=[]
            while todo:
                cell=todo.pop();comp.append(cell)
                for axis in range(order):
                    for step in [-1,1]:
                        neighbor=list(cell);neighbor[axis]+=step;neighbor=tuple(neighbor)
                        if neighbor in remaining: remaining.remove(neighbor);todo.append(neighbor)
            components.append({'dimensions':list(dims),'coordinates':[list(map(int,c)) for c in sorted(comp)],'members':sorted(set(i for c in comp for i in units[c]))})

medoids=[0,3]; localities=[[0,1,2],[3,4,5]]
deviations=np.stack([np.abs(rows[group]-rows[m]).mean(axis=0) for m,group in zip(medoids,localities)])
scores=(deviations-deviations.mean(axis=1,keepdims=True))/deviations.std(axis=1,ddof=1,keepdims=True)
dimensions=[sorted(range(rows.shape[1]),key=lambda j:(scores[c,j],j))[:2] for c in range(2)]
distances=np.stack([np.abs(rows[:,dims]-rows[m,dims]).mean(axis=1) for m,dims in zip(medoids,dimensions)],axis=1)
assigned=np.argmin(distances,axis=1)
projected_means=np.stack([rows[assigned==c].mean(axis=0) for c in range(2)])
objective=np.mean([np.abs(rows[i,dimensions[c]]-projected_means[c,dimensions[c]]).mean() for i,c in enumerate(assigned)])
def choose_dimensions(medoids, groups):
    avgs=np.stack([np.abs(rows[group or [m]]-rows[m]).mean(axis=0) for m,group in zip(medoids,groups)])
    sd=avgs.std(axis=1,ddof=1,keepdims=True)
    zs=np.divide(avgs-avgs.mean(axis=1,keepdims=True),sd,out=np.zeros_like(avgs),where=sd!=0)
    dims=[sorted(sorted(range(rows.shape[1]),key=lambda j:(zs[c,j],j))[:2]) for c in range(len(medoids))]
    return dims,zs
def assign(medoids,dims):
    distances=np.stack([np.abs(rows[:,ds]-rows[m,ds]).mean(axis=1) for m,ds in zip(medoids,dims)],axis=1)
    labs=np.argmin(distances,axis=1)
    for c,m in enumerate(medoids):
        if distances[m,c]==distances[m].min(): labs[m]=c
    return labs
def quality(labs,dims):
    means=np.stack([rows[labs==c].mean(axis=0) if np.any(labs==c) else np.zeros(rows.shape[1]) for c in range(len(dims))])
    return float(np.mean([np.abs(rows[i,dims[c]]-means[c,dims[c]]).mean() for i,c in enumerate(labs) if c>=0]))
whole_cases={}
for medoid_pair in itertools.permutations(range(len(rows)),2):
    medoid_pair=list(medoid_pair)
    radii=[np.sum((rows[medoid_pair[0]]-rows[medoid_pair[1]])**2)]*2
    locality=[np.flatnonzero(np.sum((rows-rows[m])**2,axis=1)<=radius).tolist() for m,radius in zip(medoid_pair,radii)]
    dims,zs=choose_dimensions(medoid_pair,locality)
    labels_initial=assign(medoid_pair,dims)
    members=[np.flatnonzero(labels_initial==c).tolist() for c in range(2)]
    refined_dims,refined_z=choose_dimensions(medoid_pair,members)
    labels_refined=assign(medoid_pair,refined_dims)
    influence=[float(np.abs(rows[m,ds]-rows[medoid_pair[1-c],ds]).mean()) for c,(m,ds) in enumerate(zip(medoid_pair,refined_dims))]
    is_noise=np.all(np.stack([np.abs(rows[:,ds]-rows[m,ds]).mean(axis=1)>radius for m,ds,radius in zip(medoid_pair,refined_dims,influence)],axis=1),axis=1)
    whole_cases[','.join(map(str,medoid_pair))]={'localities':locality,'scores':zs.tolist(),'dimensions':dims,'labels':labels_initial.tolist(),'cost':quality(labels_initial,dims),'refinedDimensions':refined_dims,'refinedScores':refined_z.tolist(),'finalLabels':np.where(is_noise,-1,labels_refined).tolist(),'fullCost':quality(labels_refined,refined_dims),'influence':influence}
out={
 'provenance':{'numpy':np.__version__,'method':'Independent NumPy counts/means and exhaustive subspace grids; independent PROCLUS declared-locality arithmetic','note':'No assertion of heuristic global optimality.'},
 'categorical':categorical.tolist(),'numeric':numeric.tolist(),'partition':labels.tolist(),
 'categoricalCenters':centers,'numericCenters':means.tolist(),'categoricalCost':int(categorical_cost),'mixedCost':float(mixed_cost),
 'clique':{'rows':rows.tolist(),'gridBins':grid,'densityThreshold':threshold,'maxDimensions':max_dimension,'dense':dense,'components':components},
 'proclus':{'rows':rows.tolist(),'medoids':medoids,'localities':localities,'scores':scores.tolist(),'dimensions':dimensions,'labels':assigned.tolist(),'objective':float(objective),'orderedMedoidCases':whole_cases}
}
(root/'src/engine/fixtures/data-clustering-reference.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(f'Wrote data-clustering-reference.json; numpy={np.__version__}, K-Modes cost={categorical_cost}, mixed={mixed_cost}, dense units={len(dense)}, PROCLUS cost={objective}')
