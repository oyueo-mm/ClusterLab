# Bundled fonts

- Black Han Sans, official Google Fonts source: https://github.com/google/fonts/tree/main/ofl/blackhansans . `BlackHanSans-title.ttf` is a glyph subset of the original Regular TTF containing only `클러스터링 알고리즘` and space. No weight conversion. Original copyright and naming metadata retained. Black Han Sans's OFL file has no Reserved Font Name. See BlackHanSans-OFL.txt.
- Pretendard, official source: https://github.com/orioncactus/pretendard . `PretendardVariable.woff2` is the unmodified official variable font from `packages/pretendard/dist/web/variable/woff2`. CSS uses weights 400–700 from this single file. Reserved Font Name Pretendard retained. See Pretendard-OFL.txt.

Both are SIL Open Font License 1.1. Licenses are redistributed beside the font files. Fonts are served by ClusterLab's own origin; there are no external Google Fonts/CDN requests. `font-display: swap` and system fallbacks keep the interface usable when font loading fails. The display face is limited to the home title; body, controls and labels use Pretendard. The title subset is about 9KB, and the original full Korean variable font is about 2.06MB.
