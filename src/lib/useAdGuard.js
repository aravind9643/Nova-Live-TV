import { useEffect } from 'react';

// Defends the layout against AdSense Auto Ads.
export function useAdGuard() {
  // AdSense page-level ads stamp `height: auto !important` onto #root/.app,
  // which breaks the viewport height chain: .main then grows to the virtual
  // list's full spacer height (100k+ px), so it can't scroll and the virtualiser
  // renders every card.
  //
  // The targets must be re-resolved on every pass: switching to the watch screen
  // unmounts `.app` entirely, so a node captured at mount time goes stale.
  useEffect(() => {
    const strip = () => {
      const targets = [
        document.getElementById('root'),
        document.querySelector('.app'),
        document.querySelector('.watch'),
      ];
      for (const el of targets) {
        if (!el) continue;
        if (el.style.getPropertyValue('height')) el.style.removeProperty('height');
        if (el.style.getPropertyValue('min-height')) el.style.removeProperty('min-height');
        if (el.style.getPropertyValue('max-height')) el.style.removeProperty('max-height');
      }
    };
    strip();

    // Observe the whole document so newly-mounted screens are covered too.
    const mo = new MutationObserver(strip);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
      childList: true,
    });
    return () => mo.disconnect();
  }, []);

  // Auto Ads inject floating units we never asked for — side rails, vignettes
  // and top-docked anchors — which land on top of the channel grid and the
  // header. Our own <AdSlot>s live inside `.ad-slot` in the normal document
  // flow, so anything floating OUTSIDE one of those is fair game:
  //   • a top-docked anchor gets moved to the bottom (still monetises)
  //   • a free-floating overlay over the content is removed outright
  useEffect(() => {
    const tame = () => {
      const nodes = document.querySelectorAll(
        'ins.adsbygoogle, iframe[id^="aswift"], iframe[name^="google_ads"], [id^="google_ads_iframe"]'
      );

      for (const el of nodes) {
        // Never touch the units we placed ourselves.
        if (el.closest('.ad-slot')) continue;

        const host = el.closest('ins, div') || el;
        const cs = getComputedStyle(host);
        if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;

        const r = host.getBoundingClientRect();
        if (r.width < 40 || r.height < 40) continue;

        const isAnchor = host.classList.contains('adsbygoogle-noablate');
        const nearTop = r.top < 90;
        const nearBottom = r.bottom > window.innerHeight - 90;

        if (isAnchor && nearBottom && !nearTop) continue; // bottom anchor is fine

        if (isAnchor && nearTop) {
          host.style.setProperty('top', 'auto', 'important');
          host.style.setProperty('bottom', '0', 'important');
          continue;
        }

        // A floating panel sitting over the content — hide it.
        host.style.setProperty('display', 'none', 'important');
      }
    };

    tame();
    const mo = new MutationObserver(tame);
    mo.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'],
    });
    const iv = setInterval(tame, 1500);
    return () => { mo.disconnect(); clearInterval(iv); };
  }, []);
}
