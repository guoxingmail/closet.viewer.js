import React from "react";
import URL from "url";
import P from "path";

export const template = (modelURL:URL.URL) => (
  <div>
    <div id="target" style={{
        width: 512, height: 512
    }}></div>
    <script type="text/javascript" src={URL.pathToFileURL(P.resolve(__dirname, '../../dist/closet.viewer.js')).toString()}></script>
    {/* <script type="text/javascript" src={URL.pathToFileURL(P.resolve(__dirname, 'template-src.js')).toString()}></script> */}
    <script dangerouslySetInnerHTML={{ __html: `
    console.log(closet)
    closet.viewer.init({
        element: 'target',
        width: 512,
        height: 512,
        stats: true
    });
    closet.viewer.loadZrestUrl('${modelURL.toString()}', function(x){}, function(x){
        (async function() {
            await fetch("http://screenshotrequest.clo", {method: 'POST',})
            await fetch("http://screenshotrequest.clo", {method: 'DELETE',})
        })()
    })
    `}}>
    </script>
  </div>
);
