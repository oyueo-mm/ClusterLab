# Exact recommendation sizes (212 configurations)

Before = previous recommendation default, not a change to legacy preset defaults. All rows were generated reproducibly and executed in the real engine. Timings use two dedicated serial test files on the recorded host, include Recorder work and exclude module load. Matrix counts mean rows; time-series counts mean series, with original columns/length unchanged.

| Algorithm | Dataset | Role | Before | After / actual | Seed | Compute ms | Trace estimate MiB |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| K-Means | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 12.69 | 1.04 |
| K-Means | anisotropic (비등방성 군집) | additional | 120 | 240 / 240 | 42 | 16.49 | 2.37 |
| K-Means | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 9.35 | 1.37 |
| K-Means | circles (동심원) | limit | 120 | 240 / 240 | 42 | 22.78 | 3.37 |
| DBSCAN | moons (두 개의 초승달) | default | 120 | 200 / 200 | 42 | 6.93 | 3.19 |
| DBSCAN | outliers (노이즈와 이상치) | additional | 120 | 200 / 200 | 42 | 6.63 | 3.19 |
| DBSCAN | moons-alternate (두 개의 초승달 · 다른 표본) | additional | 120 | 200 / 200 | 137 | 5.50 | 3.19 |
| DBSCAN | density (서로 다른 밀도의 군집) | limit | 120 | 200 / 200 | 42 | 5.12 | 3.20 |
| HDBSCAN | density (서로 다른 밀도의 군집) | default | 120 | 160 / 160 | 42 | 23.25 | 1.54 |
| HDBSCAN | unequal (크기가 다른 군집) | additional | 120 | 160 / 160 | 42 | 21.07 | 1.54 |
| HDBSCAN | density-alternate (서로 다른 밀도의 군집 · 다른 표본) | additional | 120 | 160 / 160 | 137 | 16.99 | 1.52 |
| HDBSCAN | bridge (연결된 군집) | limit | 120 | 160 / 160 | 42 | 14.88 | 1.56 |
| AGNES | blobs (가우시안 군집) | default | 120 | 60 / 60 | 42 | 18.77 | 1.01 |
| AGNES | elongated (길쭉한 군집) | additional | 120 | 60 / 60 | 42 | 21.06 | 1.01 |
| AGNES | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 60 / 60 | 137 | 16.06 | 1.01 |
| AGNES | bridge (연결된 군집) | limit | 120 | 60 / 60 | 42 | 15.52 | 1.01 |
| DIANA | unequal (크기가 다른 군집) | default | 120 | 80 / 80 | 42 | 6.18 | 0.02 |
| DIANA | blobs (가우시안 군집) | additional | 120 | 80 / 80 | 42 | 8.84 | 0.05 |
| DIANA | unequal-alternate (크기가 다른 군집 · 다른 표본) | additional | 120 | 80 / 80 | 137 | 5.76 | 0.03 |
| DIANA | overlap (겹치는 군집) | limit | 120 | 80 / 80 | 42 | 7.73 | 0.03 |
| SOM | grid (격자형 데이터) | default | 120 | 240 / 240 | 42 | 40.66 | 6.22 |
| SOM | blobs (가우시안 군집) | additional | 120 | 240 / 240 | 42 | 39.70 | 6.22 |
| SOM | grid-alternate (격자형 데이터 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 42.97 | 6.22 |
| SOM | outliers (노이즈와 이상치) | limit | 120 | 240 / 240 | 42 | 40.30 | 6.22 |
| LVQ | labeled (라벨이 있는 분류 데이터) | default | 120 | 240 / 240 | 42 | 22.14 | 4.08 |
| LVQ | labeled-overlap (겹치는 클래스) | additional | 120 | 240 / 240 | 42 | 21.91 | 4.08 |
| LVQ | labeled-alternate (라벨이 있는 분류 데이터 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 23.53 | 4.08 |
| LVQ | labeled-overlap (겹치는 클래스) | limit | 120 | 240 / 240 | 42 | 20.37 | 4.08 |
| OPTICS | density (서로 다른 밀도의 군집) | default | 120 | 180 / 180 | 42 | 16.01 | 2.29 |
| OPTICS | moons (두 개의 초승달) | additional | 120 | 180 / 180 | 42 | 12.75 | 2.91 |
| OPTICS | density-alternate (서로 다른 밀도의 군집 · 다른 표본) | additional | 120 | 180 / 180 | 137 | 9.86 | 2.51 |
| OPTICS | gradient (밀도 기울기) | limit | 120 | 180 / 180 | 42 | 9.44 | 1.71 |
| PAM | outliers (노이즈와 이상치) | default | 120 | 80 / 80 | 42 | 7.42 | 0.28 |
| PAM | blobs (가우시안 군집) | additional | 120 | 80 / 80 | 42 | 7.89 | 0.28 |
| PAM | outliers-alternate (노이즈와 이상치 · 다른 표본) | additional | 120 | 80 / 80 | 137 | 7.23 | 0.28 |
| PAM | circles (동심원) | limit | 120 | 80 / 80 | 42 | 11.60 | 0.56 |
| ROCK | categorical (범주형 군집) | default | 120 | 80 / 80 | 42 | 19.04 | 0.50 |
| ROCK | categorical-noisy (노이즈가 있는 범주형 데이터) | additional | 120 | 80 / 80 | 42 | 17.16 | 0.50 |
| ROCK | categorical-alternate (범주형 군집 · 다른 표본) | additional | 120 | 80 / 80 | 137 | 14.01 | 0.50 |
| ROCK | categorical-noisy (노이즈가 있는 범주형 데이터) | limit | 120 | 80 / 80 | 42 | 13.80 | 0.50 |
| GMM | anisotropic (비등방성 군집) | default | 120 | 240 / 240 | 42 | 6.18 | 0.17 |
| GMM | overlap (겹치는 군집) | additional | 120 | 240 / 240 | 42 | 8.61 | 0.32 |
| GMM | anisotropic-alternate (비등방성 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 3.21 | 0.22 |
| GMM | rings (고리형 군집) | limit | 120 | 240 / 240 | 42 | 4.86 | 0.32 |
| BIRCH | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 29.90 | 3.51 |
| BIRCH | unequal (크기가 다른 군집) | additional | 120 | 240 / 240 | 42 | 24.04 | 3.23 |
| BIRCH | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 29.39 | 3.94 |
| BIRCH | elongated (길쭉한 군집) | limit | 120 | 240 / 240 | 42 | 26.54 | 3.59 |
| Mean Shift | blobs (가우시안 군집) | default | 120 | 160 / 160 | 42 | 43.95 | 6.78 |
| Mean Shift | density (서로 다른 밀도의 군집) | additional | 120 | 160 / 160 | 42 | 61.39 | 9.13 |
| Mean Shift | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 160 / 160 | 137 | 35.82 | 5.94 |
| Mean Shift | bridge (연결된 군집) | limit | 120 | 160 / 160 | 42 | 51.91 | 8.11 |
| Fuzzy C-Means | overlap (겹치는 군집) | default | 120 | 240 / 240 | 42 | 6.22 | 0.32 |
| Fuzzy C-Means | blobs (가우시안 군집) | additional | 120 | 240 / 240 | 42 | 2.53 | 0.21 |
| Fuzzy C-Means | overlap-alternate (겹치는 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 4.69 | 0.31 |
| Fuzzy C-Means | outliers (노이즈와 이상치) | limit | 120 | 240 / 240 | 42 | 2.72 | 0.23 |
| Bisecting K-Means | unequal (크기가 다른 군집) | default | 120 | 240 / 240 | 42 | 1.13 | 0.05 |
| Bisecting K-Means | four (네 모서리 군집) | additional | 120 | 240 / 240 | 42 | 0.62 | 0.04 |
| Bisecting K-Means | unequal-alternate (크기가 다른 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 0.43 | 0.04 |
| Bisecting K-Means | circles (동심원) | limit | 120 | 240 / 240 | 42 | 0.63 | 0.06 |
| Spectral Clustering | circles (동심원) | default | 120 | 64 / 64 | 42 | 27.10 | 0.26 |
| Spectral Clustering | moons (두 개의 초승달) | additional | 120 | 64 / 64 | 42 | 19.05 | 0.26 |
| Spectral Clustering | circles-alternate (동심원 · 다른 표본) | additional | 120 | 64 / 64 | 137 | 21.07 | 0.26 |
| Spectral Clustering | bridge (연결된 군집) | limit | 120 | 64 / 64 | 42 | 13.24 | 0.26 |
| Affinity Propagation | blobs (가우시안 군집) | default | 120 | 64 / 64 | 42 | 24.29 | 1.92 |
| Affinity Propagation | unequal (크기가 다른 군집) | additional | 120 | 64 / 64 | 42 | 18.02 | 1.54 |
| Affinity Propagation | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 64 / 64 | 137 | 17.21 | 1.47 |
| Affinity Propagation | overlap (겹치는 군집) | limit | 120 | 64 / 64 | 42 | 16.18 | 1.79 |
| Density Peaks / CFSFDP | density (서로 다른 밀도의 군집) | default | 120 | 160 / 160 | 42 | 12.26 | 2.02 |
| Density Peaks / CFSFDP | moons (두 개의 초승달) | additional | 120 | 160 / 160 | 42 | 11.26 | 2.02 |
| Density Peaks / CFSFDP | density-alternate (서로 다른 밀도의 군집 · 다른 표본) | additional | 120 | 160 / 160 | 137 | 9.93 | 2.02 |
| Density Peaks / CFSFDP | uniform (균일 무작위 분포) | limit | 120 | 160 / 160 | 42 | 10.26 | 2.02 |
| CURE | elongated (길쭉한 군집) | default | 120 | 60 / 60 | 42 | 23.05 | 1.45 |
| CURE | unequal (크기가 다른 군집) | additional | 120 | 60 / 60 | 42 | 21.45 | 1.39 |
| CURE | elongated-alternate (길쭉한 군집 · 다른 표본) | additional | 120 | 60 / 60 | 137 | 19.29 | 1.46 |
| CURE | bridge (연결된 군집) | limit | 120 | 60 / 60 | 42 | 15.28 | 1.43 |
| Neural Gas | rings (고리형 군집) | default | 120 | 200 / 200 | 42 | 26.41 | 3.45 |
| Neural Gas | blobs (가우시안 군집) | additional | 120 | 200 / 200 | 42 | 23.50 | 3.45 |
| Neural Gas | rings-alternate (고리형 군집 · 다른 표본) | additional | 120 | 200 / 200 | 137 | 24.72 | 3.45 |
| Neural Gas | outliers (노이즈와 이상치) | limit | 120 | 200 / 200 | 42 | 21.95 | 3.45 |
| Growing Neural Gas | moons (두 개의 초승달) | default | 120 | 200 / 200 | 42 | 273.50 | 33.16 |
| Growing Neural Gas | rings (고리형 군집) | additional | 120 | 200 / 200 | 42 | 379.73 | 45.19 |
| Growing Neural Gas | moons-alternate (두 개의 초승달 · 다른 표본) | additional | 120 | 200 / 200 | 137 | 330.61 | 33.77 |
| Growing Neural Gas | outliers (노이즈와 이상치) | limit | 120 | 200 / 200 | 42 | 382.08 | 42.07 |
| K-Medians | outliers (노이즈와 이상치) | default | 120 | 240 / 240 | 42 | 1.75 | 0.02 |
| K-Medians | blobs (가우시안 군집) | additional | 120 | 240 / 240 | 42 | 0.78 | 0.03 |
| K-Medians | outliers-alternate (노이즈와 이상치 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 0.45 | 0.02 |
| K-Medians | circles (동심원) | limit | 120 | 240 / 240 | 42 | 0.57 | 0.03 |
| Mini-Batch K-Means | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 2.82 | 0.25 |
| Mini-Batch K-Means | unequal (크기가 다른 군집) | additional | 120 | 240 / 240 | 42 | 2.67 | 0.25 |
| Mini-Batch K-Means | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 2.67 | 0.25 |
| Mini-Batch K-Means | overlap (겹치는 군집) | limit | 120 | 240 / 240 | 42 | 2.68 | 0.25 |
| CLARA | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 4.42 | 0.06 |
| CLARA | outliers (노이즈와 이상치) | additional | 120 | 240 / 240 | 42 | 3.19 | 0.06 |
| CLARA | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 4.35 | 0.05 |
| CLARA | satellite (위성형 군집) | limit | 120 | 240 / 240 | 42 | 3.57 | 0.06 |
| CLARANS | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 11.42 | 0.50 |
| CLARANS | unequal (크기가 다른 군집) | additional | 120 | 240 / 240 | 42 | 13.94 | 0.48 |
| CLARANS | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 12.12 | 0.50 |
| CLARANS | satellite (위성형 군집) | limit | 120 | 240 / 240 | 42 | 10.12 | 0.46 |
| X-Means | numeric-base (다차원 분리 군집) | default | 24 | 240 / 240 | 42 | 4.70 | 0.09 |
| X-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 3.97 | 0.17 |
| X-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 3.27 | 0.09 |
| X-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.78 | 0.02 |
| G-Means | numeric-base (다차원 분리 군집) | default | 24 | 240 / 240 | 42 | 6.28 | 0.09 |
| G-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 4.30 | 0.14 |
| G-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 3.87 | 0.09 |
| G-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.39 | 0.02 |
| Dip-Means | numeric-base (다차원 분리 군집) | default | 24 | 60 / 60 | 42 | 9.38 | 0.03 |
| Dip-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 60 / 60 | 42 | 8.12 | 0.03 |
| Dip-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 60 / 60 | 137 | 9.15 | 0.03 |
| Dip-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 3.49 | 0.03 |
| DP-Means | numeric-base (다차원 분리 군집) | default | 24 | 240 / 240 | 42 | 28.98 | 3.38 |
| DP-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 31.93 | 3.41 |
| DP-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 27.01 | 3.37 |
| DP-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.69 | 0.03 |
| Louvain | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 4.93 | 0.22 |
| Louvain | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 4.84 | 0.24 |
| Louvain | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 4.75 | 0.22 |
| Louvain | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 3.08 | 0.22 |
| Leiden | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 4.90 | 0.37 |
| Leiden | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 5.99 | 0.41 |
| Leiden | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 6.95 | 0.37 |
| Leiden | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 3.29 | 0.38 |
| Label Propagation | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 3.51 | 0.22 |
| Label Propagation | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 3.37 | 0.27 |
| Label Propagation | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 3.32 | 0.22 |
| Label Propagation | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 2.48 | 0.14 |
| Girvan–Newman | graph-base (연결 커뮤니티) | default | 24 | 32 / 32 | 42 | 5.81 | 0.12 |
| Girvan–Newman | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 32 / 32 | 42 | 15.00 | 0.32 |
| Girvan–Newman | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 32 / 32 | 137 | 2.55 | 0.12 |
| Girvan–Newman | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 32 / 32 | 42 | 11.20 | 0.32 |
| Markov Clustering (MCL) | graph-base (연결 커뮤니티) | default | 24 | 40 / 40 | 42 | 19.04 | 0.50 |
| Markov Clustering (MCL) | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 40 / 40 | 42 | 10.83 | 0.61 |
| Markov Clustering (MCL) | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 40 / 40 | 137 | 13.86 | 0.50 |
| Markov Clustering (MCL) | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 40 / 40 | 42 | 6.25 | 0.24 |
| K-Modes | categorical-base (범주형 속성 집단) | default | 24 | 160 / 160 | 42 | 1.95 | 0.04 |
| K-Modes | categorical-ambiguous (범주형 속성 집단 · 모호한 구조) | additional | 24 | 160 / 160 | 42 | 1.68 | 0.03 |
| K-Modes | categorical-base-alternate (범주형 속성 집단 · 다른 표본) | additional | 24 | 160 / 160 | 137 | 0.71 | 0.04 |
| K-Modes | categorical-boundary (범주형 속성 집단 · 경계 실험) | limit | 24 | 160 / 160 | 42 | 1.44 | 0.03 |
| K-Prototypes | mixed-base (수치·범주 혼합 집단) | default | 24 | 160 / 160 | 42 | 2.68 | 0.02 |
| K-Prototypes | mixed-ambiguous (수치·범주 혼합 집단 · 모호한 구조) | additional | 24 | 160 / 160 | 42 | 1.82 | 0.03 |
| K-Prototypes | mixed-base-alternate (수치·범주 혼합 집단 · 다른 표본) | additional | 24 | 160 / 160 | 137 | 4.96 | 0.08 |
| K-Prototypes | mixed-boundary (수치·범주 혼합 집단 · 경계 실험) | limit | 24 | 160 / 160 | 42 | 0.63 | 0.02 |
| CLIQUE | subspaces (관련 차원이 다른 부분공간) | default | 48 | 240 / 240 | 42 | 37.21 | 0.26 |
| CLIQUE | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 5.27 | 0.29 |
| CLIQUE | subspaces-alternate (관련 차원이 다른 부분공간 · 다른 표본) | additional | 48 | 240 / 240 | 137 | 48.07 | 0.26 |
| CLIQUE | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 21.73 | 0.19 |
| PROCLUS | subspaces (관련 차원이 다른 부분공간) | default | 48 | 240 / 240 | 42 | 23.49 | 0.49 |
| PROCLUS | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 12.02 | 0.64 |
| PROCLUS | subspaces-alternate (관련 차원이 다른 부분공간 · 다른 표본) | additional | 48 | 240 / 240 | 137 | 9.01 | 0.37 |
| PROCLUS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 4.34 | 0.31 |
| DenStream | stream-base (등장·소멸 스트림) | default | 48 | 300 / 300 | 42 | 6.71 | 0.07 |
| DenStream | stream-ambiguous (등장·소멸 스트림 · 모호한 구조) | additional | 48 | 300 / 300 | 42 | 4.25 | 0.09 |
| DenStream | stream-base-alternate (등장·소멸 스트림 · 다른 표본) | additional | 48 | 300 / 300 | 137 | 1.35 | 0.06 |
| DenStream | stream-boundary (등장·소멸 스트림 · 경계 실험) | limit | 48 | 300 / 300 | 42 | 1.50 | 0.06 |
| Bimax | matrix-base (이진 블록 행렬) | default | 24 | 64 / 64 | 42 | 2.55 | 0.05 |
| Bimax | matrix-ambiguous (이진 블록 행렬 · 모호한 구조) | additional | 24 | 64 / 64 | 42 | 74.84 | 10.98 |
| Bimax | matrix-base-alternate (이진 블록 행렬 · 다른 표본) | additional | 24 | 64 / 64 | 137 | 0.41 | 0.05 |
| Bimax | matrix-boundary (이진 블록 행렬 · 경계 실험) | limit | 24 | 64 / 64 | 42 | 0.38 | 0.05 |
| Cheng–Church Biclustering | matrix-base (이진 블록 행렬) | default | 24 | 64 / 64 | 42 | 8.86 | 0.57 |
| Cheng–Church Biclustering | matrix-ambiguous (이진 블록 행렬 · 모호한 구조) | additional | 24 | 64 / 64 | 42 | 9.22 | 1.02 |
| Cheng–Church Biclustering | matrix-base-alternate (이진 블록 행렬 · 다른 표본) | additional | 24 | 64 / 64 | 137 | 5.21 | 0.57 |
| Cheng–Church Biclustering | matrix-boundary (이진 블록 행렬 · 경계 실험) | limit | 24 | 64 / 64 | 42 | 7.12 | 0.57 |
| K-Shape | timeseries-base (위상·스케일 파형) | default | 24 | 40 / 40 | 42 | 25.50 | 0.67 |
| K-Shape | timeseries-ambiguous (위상·스케일 파형 · 모호한 구조) | additional | 24 | 40 / 40 | 42 | 40.59 | 1.65 |
| K-Shape | timeseries-base-alternate (위상·스케일 파형 · 다른 표본) | additional | 24 | 40 / 40 | 137 | 26.42 | 0.98 |
| K-Shape | timeseries-boundary (위상·스케일 파형 · 경계 실험) | limit | 24 | 40 / 40 | 42 | 21.15 | 0.98 |
| Greedy Modularity (CNM) | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 5.63 | 1.14 |
| Greedy Modularity (CNM) | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 6.87 | 1.18 |
| Greedy Modularity (CNM) | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 4.77 | 1.14 |
| Greedy Modularity (CNM) | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 6.55 | 1.11 |
| Fluid Communities | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 5.13 | 0.43 |
| Fluid Communities | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 3.26 | 0.48 |
| Fluid Communities | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 3.35 | 0.43 |
| Fluid Communities | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | limit | 24 | 48 / 48 | 42 | 3.40 | 0.48 |
| COP-KMeans | constrained-base (연결·분리 제약) | default | 24 | 120 / 120 | 42 | 3.95 | 0.02 |
| COP-KMeans | constrained-ambiguous (연결·분리 제약 · 모호한 구조) | additional | 24 | 120 / 120 | 42 | 1.11 | 0.02 |
| COP-KMeans | constrained-base-alternate (연결·분리 제약 · 다른 표본) | additional | 24 | 120 / 120 | 137 | 0.67 | 0.02 |
| COP-KMeans | constrained-boundary (연결·분리 제약 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 2.14 | 0.15 |
| Bernoulli Mixture | bernoulli-base (이진 응답 집단) | default | 24 | 240 / 240 | 42 | 6.59 | 0.37 |
| Bernoulli Mixture | bernoulli-ambiguous (이진 응답 집단 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 4.87 | 0.56 |
| Bernoulli Mixture | bernoulli-base-alternate (이진 응답 집단 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 5.18 | 0.34 |
| Bernoulli Mixture | bernoulli-boundary (이진 응답 집단 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.72 | 0.03 |
| Poisson Mixture | poisson-base (발생 빈도 집단) | default | 24 | 240 / 240 | 42 | 5.70 | 0.18 |
| Poisson Mixture | poisson-ambiguous (발생 빈도 집단 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 3.29 | 0.19 |
| Poisson Mixture | poisson-base-alternate (발생 빈도 집단 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 1.56 | 0.15 |
| Poisson Mixture | poisson-boundary (발생 빈도 집단 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.25 | 0.03 |
| Multinomial Mixture | multinomial-base (문서 구성 카운트) | default | 24 | 240 / 240 | 42 | 5.09 | 0.15 |
| Multinomial Mixture | multinomial-ambiguous (문서 구성 카운트 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 2.79 | 0.15 |
| Multinomial Mixture | multinomial-base-alternate (문서 구성 카운트 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 2.17 | 0.15 |
| Multinomial Mixture | multinomial-boundary (문서 구성 카운트 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.20 | 0.02 |
| Walktrap | graph-base (연결 커뮤니티) | default | 24 | 40 / 40 | 42 | 8.37 | 0.81 |
| Walktrap | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 40 / 40 | 42 | 5.87 | 0.88 |
| Walktrap | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 40 / 40 | 137 | 8.16 | 0.81 |
| Walktrap | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 40 / 40 | 42 | 13.08 | 0.89 |
| Clique Percolation | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 3.11 | 0.36 |
| Clique Percolation | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 2.31 | 0.40 |
| Clique Percolation | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 4.94 | 0.36 |
| Clique Percolation | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | limit | 24 | 48 / 48 | 42 | 2.21 | 0.40 |
| BSAS | ordered (순서와 두 임계값) | default | 12 | 12 / 12 | 42 | 2.67 | 0.06 |
| BSAS | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 18.14 | 2.23 |
| BSAS | ordered-alternate (순서와 두 임계값 · 다른 표본) | additional | 12 | 12 / 12 | 137 | 0.68 | 0.06 |
| BSAS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 30.11 | 2.40 |
| MBSAS | ordered (순서와 두 임계값) | default | 12 | 12 / 12 | 42 | 1.30 | 0.10 |
| MBSAS | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 69.15 | 6.15 |
| MBSAS | ordered-alternate (순서와 두 임계값 · 다른 표본) | additional | 12 | 12 / 12 | 137 | 0.96 | 0.10 |
| MBSAS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 61.53 | 6.21 |
| TTSAS | ordered (순서와 두 임계값) | default | 12 | 12 / 12 | 42 | 3.22 | 0.12 |
| TTSAS | numeric-base (다차원 분리 군집) | additional | 24 | 160 / 160 | 42 | 4.13 | 0.12 |
| TTSAS | ordered-alternate (순서와 두 임계값 · 다른 표본) | additional | 12 | 12 / 12 | 137 | 1.90 | 0.12 |
| TTSAS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 160 / 160 | 42 | 39.19 | 0.35 |
