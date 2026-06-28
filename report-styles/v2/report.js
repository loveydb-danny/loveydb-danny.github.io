/* report.js — Milestone A stub
 * Re:sum Monthly Report WebView
 * Hosted: https://loveydb-danny.github.io/report-styles/report.js
 *
 * Milestone A: DOMContentLoaded skeleton only.
 * Photo signed-URL back-fill pattern is defined but no-op until
 * Milestone B (photos are not present in placeholder HTML).
 *
 * SECURITY NOTE: No API keys, tokens, or couple data in this file.
 * This file is publicly accessible via GitHub Pages.
 */

(function () {
  'use strict';

  /**
   * Read data attributes from <body>:
   *   data-couple-id  — couple UUID
   *   data-year       — report year (e.g. "2026")
   *   data-month      — report month (e.g. "5")
   * These are embedded by the Edge Function when generating report.html.
   */
  function getReportMeta() {
    var body = document.body;
    return {
      coupleId: body.dataset.coupleId || '',
      year:     parseInt(body.dataset.year  || '0', 10),
      month:    parseInt(body.dataset.month || '0', 10),
    };
  }

  /**
   * Collect all <img class="report-photo" data-photo-path="…"> elements
   * and return a list of { element, photoPath } entries that still need
   * a signed URL (src is empty or not yet set).
   */
  function getPendingPhotos() {
    var imgs = document.querySelectorAll('img.report-photo[data-photo-path]');
    var pending = [];
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var path = img.dataset.photoPath;
      if (path && !img.src) {
        pending.push({ element: img, photoPath: path });
      }
    }
    return pending;
  }

  /**
   * Call the Edge Function get_report_photo_urls to exchange photo
   * path identifiers for fresh signed URLs, then fill in img[src].
   *
   * Milestone A stub: this function returns early if there are no
   * pending photos (placeholder HTML has no photos).
   * Milestone B will implement the actual fetch.
   *
   * @param {Array} pending  — array of { element, photoPath }
   * @param {object} meta    — { coupleId, year, month }
   */
  function fillPhotoUrls(pending, meta) {
    if (!pending.length) {
      // No photos to fill — Milestone A placeholder path.
      return;
    }

    // TODO (Milestone B): replace stub with actual Edge Function call.
    //
    // var photoPaths = pending.map(function (p) { return p.photoPath; });
    // fetch('<SUPABASE_FUNCTION_URL>/get_report_photo_urls', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     couple_id:   meta.coupleId,
    //     year:        meta.year,
    //     month:       meta.month,
    //     photo_paths: photoPaths,
    //   }),
    // })
    // .then(function (res) { return res.json(); })
    // .then(function (data) {
    //   pending.forEach(function (p) {
    //     var url = data.urls && data.urls[p.photoPath];
    //     if (url) { p.element.src = url; }
    //   });
    // })
    // .catch(function (err) {
    //   console.warn('[report.js] photo URL fetch failed:', err);
    // });
  }

  /* ── Entry point ── */
  document.addEventListener('DOMContentLoaded', function () {
    var meta    = getReportMeta();
    var pending = getPendingPhotos();
    fillPhotoUrls(pending, meta);
  });
}());
