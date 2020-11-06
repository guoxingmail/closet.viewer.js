import React from "react";
import URL from "url";
import P from "path";

export const template = (libURL: URL.URL, modelURL: URL.URL) => (
  <div>
    <div
      id="target"
      style={{
        width: 512,
        height: 512,
      }}
    ></div>
    <script type="text/javascript" src={libURL.toString()}></script>
    <script
      dangerouslySetInnerHTML={{
        __html: `
    closet.viewer.init({
        element: 'target',
        width: 512,
        height: 512,
        stats: true
    });
    closet.viewer.loadZrestUrl('${modelURL.toString()}', function(x){}, function(x){
        (async function() {
            await fetch("http://screenshotrequest.clo", {method: 'POST',})
        })()
    })
    `,
      }}
    ></script>
  </div>
);
