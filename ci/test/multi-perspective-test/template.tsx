import React from "react";
import * as U from "url";
import * as P from "path";

export const template = (libURL: U.URL, zrestURL: U.URL) => (
  <div>
    <div id="target" style={{ width: 512, height: 512 }}></div>
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
        closet.viewer.loadZrestUrl('${zrestURL}', function(x){}, function(x){
          (async function() {
            closet.viewer.recursiveObjectwiseViewFrustumCulling();
            fetch("http://screenshotrequest.clo", {
              method: "POST",
              body: JSON.stringify({
                images: closet.viewer.capturePrincipleViews(),
              }),
            });
          })()
        })
    `,
      }}
    ></script>
  </div>
);
