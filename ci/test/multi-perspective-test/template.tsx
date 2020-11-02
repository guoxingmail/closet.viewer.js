import React from "react";
import * as U from "url";
import * as P from "path";

export const template = (zrestURL:U.URL) => (
  <div>
    <div id="target" style={{width: 512, height: 512}}></div>
    <script type='text/javascript' src={U.pathToFileURL(P.resolve(__dirname, "../../../dist/closet.viewer.js")).toString()}></script>
    <script dangerouslySetInnerHTML={{__html:`
            closet.viewer.init({
                element: 'target',
                width: 512,
                height: 512,
                stats: true
            });
            closet.viewer.loadZrestUrl('${zrestURL}', function(x){}, function(x){
                (async function() {
                    await fetch("http://screenshotrequest.clo", {method: 'POST',})
                    closet.viewer.setCameraPosition({ x: 0,y:4000,z:0 })
                    await fetch("http://screenshotrequest.clo", {method: 'POST',})
                    closet.viewer.setCameraPosition({ x: -3000,y:0,z:0 })
                    await fetch("http://screenshotrequest.clo", {method: 'POST',})
                    closet.viewer.setCameraPosition({ x: 0,y:0,z:-3000 })
                    await fetch("http://screenshotrequest.clo", {method: 'POST',})
                    await fetch("http://screenshotrequest.clo", {method: 'DELETE',})
                })()
            })
    `}}>
    </script>
  </div>
);
