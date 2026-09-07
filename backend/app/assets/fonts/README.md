# Bundled fonts

`NotoNaskhArabic-Regular.ttf` and `NotoNaskhArabic-Bold.ttf` are bundled so that
the generated PDF report renders Arabic correctly on any machine, including a
minimal container image with no system fonts installed.

They are part of Google's Noto project and are redistributed here under the
licence in `LICENSE.txt` (Apache License 2.0, as shipped with the Noto release
these files were taken from). Both that licence and the SIL Open Font License
used by more recent Noto releases permit redistribution as part of this project.

ReportLab draws glyphs but performs no complex text shaping, so Arabic is
reshaped with `arabic-reshaper` and reordered with `python-bidi` before it
reaches the canvas — see `backend/app/services/pdf_report.py`.
