'use client';

import { useEffect, useRef } from 'react';

/**
 * Smartsupp Live Chat Widget
 * Uses the official Smartsupp loader script with the account key.
 */

const SMARTSUPP_KEY = '59f61790d06665eb494e2f2818f91cf25fe527b4';

export default function ChatWidget() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!SMARTSUPP_KEY || initialized.current) return;
    initialized.current = true;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      var _smartsupp = _smartsupp || {};
      _smartsupp.key = '${SMARTSUPP_KEY}';
      window.smartsupp||(function(d) {
        var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
        s=d.getElementsByTagName('script')[0];c=d.createElement('script');
        c.type='text/javascript';c.charset='utf-8';c.async=true;
        c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
      })(document);
    `;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return null;
}
