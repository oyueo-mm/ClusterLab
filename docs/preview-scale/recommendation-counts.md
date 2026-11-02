# Exact recommendation sizes (212 configurations)

Before = previous recommendation default, not a change to legacy preset defaults. All rows were generated reproducibly and executed in the real engine. Timings use serial test files on the recorded host, include Recorder work and exclude module load. Matrix counts mean rows; time-series counts mean series, with original columns/length unchanged.

| Algorithm | Dataset | Role | Before | After / actual | Seed | Compute ms | Trace estimate MiB |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| K-Means | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 12.60 | 1.04 |
| K-Means | anisotropic (비등방성 군집) | additional | 120 | 240 / 240 | 42 | 14.89 | 2.37 |
| K-Means | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 8.32 | 1.37 |
| K-Means | circles (동심원) | limit | 120 | 240 / 240 | 42 | 22.51 | 3.37 |
| DBSCAN | moons (두 개의 초승달) | default | 120 | 200 / 200 | 42 | 7.49 | 3.19 |
| DBSCAN | outliers (노이즈와 이상치) | additional | 120 | 200 / 200 | 42 | 5.78 | 3.19 |
| DBSCAN | moons-alternate (두 개의 초승달 · 다른 표본) | additional | 120 | 200 / 200 | 137 | 5.84 | 3.19 |
| DBSCAN | density (서로 다른 밀도의 군집) | limit | 120 | 200 / 200 | 42 | 4.83 | 3.20 |
| HDBSCAN | density (서로 다른 밀도의 군집) | default | 120 | 160 / 160 | 42 | 21.60 | 1.54 |
| HDBSCAN | unequal (크기가 다른 군집) | additional | 120 | 160 / 160 | 42 | 20.25 | 1.54 |
| HDBSCAN | density-alternate (서로 다른 밀도의 군집 · 다른 표본) | additional | 120 | 160 / 160 | 137 | 16.30 | 1.52 |
| HDBSCAN | bridge (연결된 군집) | limit | 120 | 160 / 160 | 42 | 13.70 | 1.56 |
| AGNES | blobs (가우시안 군집) | default | 120 | 60 / 60 | 42 | 18.53 | 1.01 |
| AGNES | elongated (길쭉한 군집) | additional | 120 | 60 / 60 | 42 | 18.80 | 1.01 |
| AGNES | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 60 / 60 | 137 | 15.27 | 1.01 |
| AGNES | bridge (연결된 군집) | limit | 120 | 60 / 60 | 42 | 14.37 | 1.01 |
| DIANA | unequal (크기가 다른 군집) | default | 120 | 80 / 80 | 42 | 6.29 | 0.02 |
| DIANA | blobs (가우시안 군집) | additional | 120 | 80 / 80 | 42 | 8.48 | 0.05 |
| DIANA | unequal-alternate (크기가 다른 군집 · 다른 표본) | additional | 120 | 80 / 80 | 137 | 6.15 | 0.03 |
| DIANA | overlap (겹치는 군집) | limit | 120 | 80 / 80 | 42 | 6.62 | 0.03 |
| SOM | grid (격자형 데이터) | default | 120 | 240 / 240 | 42 | 38.05 | 6.22 |
| SOM | blobs (가우시안 군집) | additional | 120 | 240 / 240 | 42 | 38.13 | 6.22 |
| SOM | grid-alternate (격자형 데이터 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 37.42 | 6.22 |
| SOM | outliers (노이즈와 이상치) | limit | 120 | 240 / 240 | 42 | 37.17 | 6.22 |
| LVQ | labeled (라벨이 있는 분류 데이터) | default | 120 | 240 / 240 | 42 | 21.97 | 4.08 |
| LVQ | labeled-overlap (겹치는 클래스) | additional | 120 | 240 / 240 | 42 | 42.07 | 4.08 |
| LVQ | labeled-alternate (라벨이 있는 분류 데이터 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 29.07 | 4.08 |
| LVQ | labeled-overlap (겹치는 클래스) | limit | 120 | 240 / 240 | 42 | 21.80 | 4.08 |
| OPTICS | density (서로 다른 밀도의 군집) | default | 120 | 180 / 180 | 42 | 14.32 | 2.29 |
| OPTICS | moons (두 개의 초승달) | additional | 120 | 180 / 180 | 42 | 12.30 | 2.91 |
| OPTICS | density-alternate (서로 다른 밀도의 군집 · 다른 표본) | additional | 120 | 180 / 180 | 137 | 12.76 | 2.51 |
| OPTICS | gradient (밀도 기울기) | limit | 120 | 180 / 180 | 42 | 12.29 | 1.71 |
| PAM | outliers (노이즈와 이상치) | default | 120 | 80 / 80 | 42 | 7.42 | 0.28 |
| PAM | blobs (가우시안 군집) | additional | 120 | 80 / 80 | 42 | 7.80 | 0.28 |
| PAM | outliers-alternate (노이즈와 이상치 · 다른 표본) | additional | 120 | 80 / 80 | 137 | 7.77 | 0.28 |
| PAM | circles (동심원) | limit | 120 | 80 / 80 | 42 | 11.67 | 0.56 |
| ROCK | categorical (범주형 군집) | default | 120 | 80 / 80 | 42 | 17.16 | 0.50 |
| ROCK | categorical-noisy (노이즈가 있는 범주형 데이터) | additional | 120 | 80 / 80 | 42 | 15.55 | 0.50 |
| ROCK | categorical-alternate (범주형 군집 · 다른 표본) | additional | 120 | 80 / 80 | 137 | 13.26 | 0.50 |
| ROCK | categorical-noisy (노이즈가 있는 범주형 데이터) | limit | 120 | 80 / 80 | 42 | 11.58 | 0.50 |
| GMM | anisotropic (비등방성 군집) | default | 120 | 240 / 240 | 42 | 4.42 | 0.17 |
| GMM | overlap (겹치는 군집) | additional | 120 | 240 / 240 | 42 | 6.64 | 0.32 |
| GMM | anisotropic-alternate (비등방성 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 2.98 | 0.22 |
| GMM | rings (고리형 군집) | limit | 120 | 240 / 240 | 42 | 4.78 | 0.32 |
| BIRCH | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 25.82 | 3.51 |
| BIRCH | unequal (크기가 다른 군집) | additional | 120 | 240 / 240 | 42 | 21.59 | 3.23 |
| BIRCH | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 26.36 | 3.94 |
| BIRCH | elongated (길쭉한 군집) | limit | 120 | 240 / 240 | 42 | 24.96 | 3.59 |
| Mean Shift | blobs (가우시안 군집) | default | 120 | 160 / 160 | 42 | 39.72 | 6.78 |
| Mean Shift | density (서로 다른 밀도의 군집) | additional | 120 | 160 / 160 | 42 | 51.45 | 9.13 |
| Mean Shift | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 160 / 160 | 137 | 38.08 | 5.94 |
| Mean Shift | bridge (연결된 군집) | limit | 120 | 160 / 160 | 42 | 50.10 | 8.11 |
| Fuzzy C-Means | overlap (겹치는 군집) | default | 120 | 240 / 240 | 42 | 6.04 | 0.32 |
| Fuzzy C-Means | blobs (가우시안 군집) | additional | 120 | 240 / 240 | 42 | 3.23 | 0.21 |
| Fuzzy C-Means | overlap-alternate (겹치는 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 4.63 | 0.31 |
| Fuzzy C-Means | outliers (노이즈와 이상치) | limit | 120 | 240 / 240 | 42 | 3.03 | 0.23 |
| Bisecting K-Means | unequal (크기가 다른 군집) | default | 120 | 240 / 240 | 42 | 1.11 | 0.05 |
| Bisecting K-Means | four (네 모서리 군집) | additional | 120 | 240 / 240 | 42 | 0.52 | 0.04 |
| Bisecting K-Means | unequal-alternate (크기가 다른 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 0.53 | 0.04 |
| Bisecting K-Means | circles (동심원) | limit | 120 | 240 / 240 | 42 | 0.61 | 0.06 |
| Spectral Clustering | circles (동심원) | default | 120 | 64 / 64 | 42 | 29.72 | 0.26 |
| Spectral Clustering | moons (두 개의 초승달) | additional | 120 | 64 / 64 | 42 | 23.98 | 0.26 |
| Spectral Clustering | circles-alternate (동심원 · 다른 표본) | additional | 120 | 64 / 64 | 137 | 6.94 | 0.26 |
| Spectral Clustering | bridge (연결된 군집) | limit | 120 | 64 / 64 | 42 | 7.23 | 0.26 |
| Affinity Propagation | blobs (가우시안 군집) | default | 120 | 64 / 64 | 42 | 20.34 | 1.92 |
| Affinity Propagation | unequal (크기가 다른 군집) | additional | 120 | 64 / 64 | 42 | 17.22 | 1.54 |
| Affinity Propagation | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 64 / 64 | 137 | 14.80 | 1.47 |
| Affinity Propagation | overlap (겹치는 군집) | limit | 120 | 64 / 64 | 42 | 17.39 | 1.79 |
| Density Peaks / CFSFDP | density (서로 다른 밀도의 군집) | default | 120 | 160 / 160 | 42 | 12.29 | 2.02 |
| Density Peaks / CFSFDP | moons (두 개의 초승달) | additional | 120 | 160 / 160 | 42 | 9.58 | 2.02 |
| Density Peaks / CFSFDP | density-alternate (서로 다른 밀도의 군집 · 다른 표본) | additional | 120 | 160 / 160 | 137 | 11.31 | 2.02 |
| Density Peaks / CFSFDP | uniform (균일 무작위 분포) | limit | 120 | 160 / 160 | 42 | 11.59 | 2.02 |
| CURE | elongated (길쭉한 군집) | default | 120 | 60 / 60 | 42 | 21.79 | 1.45 |
| CURE | unequal (크기가 다른 군집) | additional | 120 | 60 / 60 | 42 | 17.56 | 1.39 |
| CURE | elongated-alternate (길쭉한 군집 · 다른 표본) | additional | 120 | 60 / 60 | 137 | 15.18 | 1.46 |
| CURE | bridge (연결된 군집) | limit | 120 | 60 / 60 | 42 | 15.46 | 1.43 |
| Neural Gas | rings (고리형 군집) | default | 120 | 200 / 200 | 42 | 23.37 | 3.45 |
| Neural Gas | blobs (가우시안 군집) | additional | 120 | 200 / 200 | 42 | 24.10 | 3.45 |
| Neural Gas | rings-alternate (고리형 군집 · 다른 표본) | additional | 120 | 200 / 200 | 137 | 21.74 | 3.45 |
| Neural Gas | outliers (노이즈와 이상치) | limit | 120 | 200 / 200 | 42 | 23.45 | 3.45 |
| Growing Neural Gas | moons (두 개의 초승달) | default | 120 | 200 / 200 | 42 | 260.06 | 33.16 |
| Growing Neural Gas | rings (고리형 군집) | additional | 120 | 200 / 200 | 42 | 330.01 | 45.19 |
| Growing Neural Gas | moons-alternate (두 개의 초승달 · 다른 표본) | additional | 120 | 200 / 200 | 137 | 280.03 | 33.77 |
| Growing Neural Gas | outliers (노이즈와 이상치) | limit | 120 | 200 / 200 | 42 | 319.61 | 42.07 |
| K-Medians | outliers (노이즈와 이상치) | default | 120 | 240 / 240 | 42 | 1.18 | 0.02 |
| K-Medians | blobs (가우시안 군집) | additional | 120 | 240 / 240 | 42 | 0.88 | 0.03 |
| K-Medians | outliers-alternate (노이즈와 이상치 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 0.50 | 0.02 |
| K-Medians | circles (동심원) | limit | 120 | 240 / 240 | 42 | 0.59 | 0.03 |
| Mini-Batch K-Means | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 2.93 | 0.25 |
| Mini-Batch K-Means | unequal (크기가 다른 군집) | additional | 120 | 240 / 240 | 42 | 2.04 | 0.25 |
| Mini-Batch K-Means | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 2.05 | 0.25 |
| Mini-Batch K-Means | overlap (겹치는 군집) | limit | 120 | 240 / 240 | 42 | 3.24 | 0.25 |
| CLARA | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 4.62 | 0.06 |
| CLARA | outliers (노이즈와 이상치) | additional | 120 | 240 / 240 | 42 | 4.84 | 0.06 |
| CLARA | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 2.60 | 0.05 |
| CLARA | satellite (위성형 군집) | limit | 120 | 240 / 240 | 42 | 3.39 | 0.06 |
| CLARANS | blobs (가우시안 군집) | default | 120 | 240 / 240 | 42 | 7.68 | 0.50 |
| CLARANS | unequal (크기가 다른 군집) | additional | 120 | 240 / 240 | 42 | 6.07 | 0.48 |
| CLARANS | blobs-alternate (가우시안 군집 · 다른 표본) | additional | 120 | 240 / 240 | 137 | 6.03 | 0.50 |
| CLARANS | satellite (위성형 군집) | limit | 120 | 240 / 240 | 42 | 4.85 | 0.46 |
| X-Means | numeric-base (다차원 분리 군집) | default | 24 | 240 / 240 | 42 | 2.98 | 0.09 |
| X-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 1.63 | 0.17 |
| X-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 1.16 | 0.09 |
| X-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.33 | 0.02 |
| G-Means | numeric-base (다차원 분리 군집) | default | 24 | 240 / 240 | 42 | 5.77 | 0.09 |
| G-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 4.39 | 0.14 |
| G-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 2.82 | 0.09 |
| G-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.39 | 0.02 |
| Dip-Means | numeric-base (다차원 분리 군집) | default | 24 | 60 / 60 | 42 | 7.49 | 0.03 |
| Dip-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 60 / 60 | 42 | 6.08 | 0.03 |
| Dip-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 60 / 60 | 137 | 5.65 | 0.03 |
| Dip-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 2.13 | 0.03 |
| DP-Means | numeric-base (다차원 분리 군집) | default | 24 | 240 / 240 | 42 | 23.50 | 3.38 |
| DP-Means | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 20.23 | 3.41 |
| DP-Means | numeric-base-alternate (다차원 분리 군집 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 20.86 | 3.37 |
| DP-Means | numeric-boundary (다차원 분리 군집 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.34 | 0.03 |
| Louvain | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 3.93 | 0.22 |
| Louvain | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 2.52 | 0.24 |
| Louvain | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 2.20 | 0.22 |
| Louvain | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 3.11 | 0.22 |
| Leiden | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 5.15 | 0.37 |
| Leiden | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 3.66 | 0.41 |
| Leiden | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 3.11 | 0.37 |
| Leiden | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 2.93 | 0.38 |
| Label Propagation | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 2.71 | 0.22 |
| Label Propagation | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 2.46 | 0.27 |
| Label Propagation | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 2.15 | 0.22 |
| Label Propagation | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 1.27 | 0.14 |
| Girvan–Newman | graph-base (연결 커뮤니티) | default | 24 | 32 / 32 | 42 | 5.21 | 0.12 |
| Girvan–Newman | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 32 / 32 | 42 | 11.15 | 0.32 |
| Girvan–Newman | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 32 / 32 | 137 | 2.27 | 0.12 |
| Girvan–Newman | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 32 / 32 | 42 | 8.75 | 0.32 |
| Markov Clustering (MCL) | graph-base (연결 커뮤니티) | default | 24 | 40 / 40 | 42 | 12.24 | 0.50 |
| Markov Clustering (MCL) | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 40 / 40 | 42 | 9.52 | 0.61 |
| Markov Clustering (MCL) | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 40 / 40 | 137 | 7.81 | 0.50 |
| Markov Clustering (MCL) | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 40 / 40 | 42 | 3.76 | 0.24 |
| K-Modes | categorical-base (범주형 속성 집단) | default | 24 | 160 / 160 | 42 | 2.47 | 0.04 |
| K-Modes | categorical-ambiguous (범주형 속성 집단 · 모호한 구조) | additional | 24 | 160 / 160 | 42 | 0.77 | 0.03 |
| K-Modes | categorical-base-alternate (범주형 속성 집단 · 다른 표본) | additional | 24 | 160 / 160 | 137 | 0.76 | 0.04 |
| K-Modes | categorical-boundary (범주형 속성 집단 · 경계 실험) | limit | 24 | 160 / 160 | 42 | 0.76 | 0.03 |
| K-Prototypes | mixed-base (수치·범주 혼합 집단) | default | 24 | 160 / 160 | 42 | 2.30 | 0.02 |
| K-Prototypes | mixed-ambiguous (수치·범주 혼합 집단 · 모호한 구조) | additional | 24 | 160 / 160 | 42 | 1.11 | 0.03 |
| K-Prototypes | mixed-base-alternate (수치·범주 혼합 집단 · 다른 표본) | additional | 24 | 160 / 160 | 137 | 2.50 | 0.08 |
| K-Prototypes | mixed-boundary (수치·범주 혼합 집단 · 경계 실험) | limit | 24 | 160 / 160 | 42 | 0.83 | 0.02 |
| CLIQUE | subspaces (관련 차원이 다른 부분공간) | default | 48 | 240 / 240 | 42 | 3.89 | 0.26 |
| CLIQUE | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 2.01 | 0.29 |
| CLIQUE | subspaces-alternate (관련 차원이 다른 부분공간 · 다른 표본) | additional | 48 | 240 / 240 | 137 | 2.24 | 0.26 |
| CLIQUE | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 2.01 | 0.19 |
| PROCLUS | subspaces (관련 차원이 다른 부분공간) | default | 48 | 240 / 240 | 42 | 11.89 | 0.49 |
| PROCLUS | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 9.19 | 0.64 |
| PROCLUS | subspaces-alternate (관련 차원이 다른 부분공간 · 다른 표본) | additional | 48 | 240 / 240 | 137 | 4.48 | 0.37 |
| PROCLUS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 3.43 | 0.31 |
| DenStream | stream-base (등장·소멸 스트림) | default | 48 | 300 / 300 | 42 | 3.35 | 0.07 |
| DenStream | stream-ambiguous (등장·소멸 스트림 · 모호한 구조) | additional | 48 | 300 / 300 | 42 | 2.27 | 0.09 |
| DenStream | stream-base-alternate (등장·소멸 스트림 · 다른 표본) | additional | 48 | 300 / 300 | 137 | 1.17 | 0.06 |
| DenStream | stream-boundary (등장·소멸 스트림 · 경계 실험) | limit | 48 | 300 / 300 | 42 | 0.88 | 0.06 |
| Bimax | matrix-base (이진 블록 행렬) | default | 24 | 64 / 64 | 42 | 1.39 | 0.05 |
| Bimax | matrix-ambiguous (이진 블록 행렬 · 모호한 구조) | additional | 24 | 64 / 64 | 42 | 50.39 | 10.98 |
| Bimax | matrix-base-alternate (이진 블록 행렬 · 다른 표본) | additional | 24 | 64 / 64 | 137 | 0.48 | 0.05 |
| Bimax | matrix-boundary (이진 블록 행렬 · 경계 실험) | limit | 24 | 64 / 64 | 42 | 0.44 | 0.05 |
| Cheng–Church Biclustering | matrix-base (이진 블록 행렬) | default | 24 | 64 / 64 | 42 | 7.90 | 0.57 |
| Cheng–Church Biclustering | matrix-ambiguous (이진 블록 행렬 · 모호한 구조) | additional | 24 | 64 / 64 | 42 | 9.16 | 1.02 |
| Cheng–Church Biclustering | matrix-base-alternate (이진 블록 행렬 · 다른 표본) | additional | 24 | 64 / 64 | 137 | 6.62 | 0.57 |
| Cheng–Church Biclustering | matrix-boundary (이진 블록 행렬 · 경계 실험) | limit | 24 | 64 / 64 | 42 | 5.38 | 0.57 |
| K-Shape | timeseries-base (위상·스케일 파형) | default | 24 | 40 / 40 | 42 | 22.70 | 0.67 |
| K-Shape | timeseries-ambiguous (위상·스케일 파형 · 모호한 구조) | additional | 24 | 40 / 40 | 42 | 56.07 | 1.65 |
| K-Shape | timeseries-base-alternate (위상·스케일 파형 · 다른 표본) | additional | 24 | 40 / 40 | 137 | 17.97 | 0.98 |
| K-Shape | timeseries-boundary (위상·스케일 파형 · 경계 실험) | limit | 24 | 40 / 40 | 42 | 15.04 | 0.98 |
| Greedy Modularity (CNM) | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 6.89 | 1.14 |
| Greedy Modularity (CNM) | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 6.59 | 1.18 |
| Greedy Modularity (CNM) | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 4.76 | 1.14 |
| Greedy Modularity (CNM) | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 48 / 48 | 42 | 7.18 | 1.11 |
| Fluid Communities | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 3.59 | 0.43 |
| Fluid Communities | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 4.30 | 0.48 |
| Fluid Communities | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 2.98 | 0.43 |
| Fluid Communities | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | limit | 24 | 48 / 48 | 42 | 3.02 | 0.48 |
| COP-KMeans | constrained-base (연결·분리 제약) | default | 24 | 120 / 120 | 42 | 1.81 | 0.02 |
| COP-KMeans | constrained-ambiguous (연결·분리 제약 · 모호한 구조) | additional | 24 | 120 / 120 | 42 | 0.52 | 0.02 |
| COP-KMeans | constrained-base-alternate (연결·분리 제약 · 다른 표본) | additional | 24 | 120 / 120 | 137 | 0.53 | 0.02 |
| COP-KMeans | constrained-boundary (연결·분리 제약 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 1.35 | 0.15 |
| Bernoulli Mixture | bernoulli-base (이진 응답 집단) | default | 24 | 240 / 240 | 42 | 5.39 | 0.37 |
| Bernoulli Mixture | bernoulli-ambiguous (이진 응답 집단 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 4.96 | 0.56 |
| Bernoulli Mixture | bernoulli-base-alternate (이진 응답 집단 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 4.76 | 0.34 |
| Bernoulli Mixture | bernoulli-boundary (이진 응답 집단 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.28 | 0.03 |
| Poisson Mixture | poisson-base (발생 빈도 집단) | default | 24 | 240 / 240 | 42 | 4.18 | 0.18 |
| Poisson Mixture | poisson-ambiguous (발생 빈도 집단 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 2.03 | 0.19 |
| Poisson Mixture | poisson-base-alternate (발생 빈도 집단 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 1.58 | 0.15 |
| Poisson Mixture | poisson-boundary (발생 빈도 집단 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.25 | 0.03 |
| Multinomial Mixture | multinomial-base (문서 구성 카운트) | default | 24 | 240 / 240 | 42 | 3.99 | 0.15 |
| Multinomial Mixture | multinomial-ambiguous (문서 구성 카운트 · 모호한 구조) | additional | 24 | 240 / 240 | 42 | 2.24 | 0.15 |
| Multinomial Mixture | multinomial-base-alternate (문서 구성 카운트 · 다른 표본) | additional | 24 | 240 / 240 | 137 | 2.01 | 0.15 |
| Multinomial Mixture | multinomial-boundary (문서 구성 카운트 · 경계 실험) | limit | 24 | 24 / 24 | 42 | 0.20 | 0.02 |
| Walktrap | graph-base (연결 커뮤니티) | default | 24 | 40 / 40 | 42 | 6.96 | 0.81 |
| Walktrap | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 40 / 40 | 42 | 6.18 | 0.88 |
| Walktrap | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 40 / 40 | 137 | 5.56 | 0.81 |
| Walktrap | graph-boundary (연결 커뮤니티 · 경계 실험) | limit | 24 | 40 / 40 | 42 | 6.79 | 0.89 |
| Clique Percolation | graph-base (연결 커뮤니티) | default | 24 | 48 / 48 | 42 | 3.37 | 0.36 |
| Clique Percolation | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | additional | 24 | 48 / 48 | 42 | 2.37 | 0.40 |
| Clique Percolation | graph-base-alternate (연결 커뮤니티 · 다른 표본) | additional | 24 | 48 / 48 | 137 | 2.09 | 0.36 |
| Clique Percolation | graph-ambiguous (연결 커뮤니티 · 모호한 구조) | limit | 24 | 48 / 48 | 42 | 2.71 | 0.40 |
| BSAS | ordered (순서와 두 임계값) | default | 12 | 12 / 12 | 42 | 1.21 | 0.06 |
| BSAS | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 16.87 | 2.23 |
| BSAS | ordered-alternate (순서와 두 임계값 · 다른 표본) | additional | 12 | 12 / 12 | 137 | 0.54 | 0.06 |
| BSAS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 17.31 | 2.40 |
| MBSAS | ordered (순서와 두 임계값) | default | 12 | 12 / 12 | 42 | 1.17 | 0.10 |
| MBSAS | numeric-base (다차원 분리 군집) | additional | 24 | 240 / 240 | 42 | 47.41 | 6.15 |
| MBSAS | ordered-alternate (순서와 두 임계값 · 다른 표본) | additional | 12 | 12 / 12 | 137 | 1.22 | 0.10 |
| MBSAS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 240 / 240 | 42 | 49.91 | 6.21 |
| TTSAS | ordered (순서와 두 임계값) | default | 12 | 12 / 12 | 42 | 1.32 | 0.12 |
| TTSAS | numeric-base (다차원 분리 군집) | additional | 24 | 160 / 160 | 42 | 1.97 | 0.12 |
| TTSAS | ordered-alternate (순서와 두 임계값 · 다른 표본) | additional | 12 | 12 / 12 | 137 | 1.08 | 0.12 |
| TTSAS | numeric-ambiguous (다차원 분리 군집 · 모호한 구조) | limit | 24 | 160 / 160 | 42 | 26.99 | 0.35 |
