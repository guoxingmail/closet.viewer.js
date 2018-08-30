
import 'babel-polyfill'
import { init, loadZrestUrl, onWindowResize, getCameraMatrix, changeColorway, loadZrestUrlWithParameters, setCameraMatrix, capture, stopRender } from './viewer'
global._babelPolyfill = false;

const closet = window.closet || {
    viewer: require('./viewer')
}

exports.closet = closet

// class ClosetViewer {
//     constructor() {
//         console.log('ClosetViewer')
//
//     }
// }

// var ClosetViewer = function(){
//
// }
//
// ClosetViewer.prototype = require('./viewer')
//
// exports.ClosetViewer = ClosetViewer

//
// window.closet = window.closet || (function () {
//     return {
//         init: function(data) {
//             console.log(data)
//         },
//         viewer: {
//             init: function(data){
//                 console.log('viewer init', data)
//                 init(data);
//             },
//             loadZrestUrl: function(url, callback) {
//                 if(url !== ''){
//                     loadZrestUrl(url, callback);
//                 }
//             },
//             // camera matrix�� colorway index ������Ʈ ���� �Ÿ� �� ������ undefined ���·� �ѱ�� �ȴ�.
//             loadZrestUrlWithParameters: function(url, cameraMatrix, colorwayIndex, callback) {
//                 if(url !== ''){
//                     loadZrestUrlWithParameters(url, cameraMatrix, colorwayIndex, callback);
//                 }
//             },
//             onWindowResize : function(data){
//                 onWindowResize(data);
//             },
//             getCameraMatrix : function() {
//                 return getCameraMatrix();
//             },
//             setCameraMatrix : function(mat, bUpdateRendering) {
//                 setCameraMatrix(mat, bUpdateRendering);
//             },
//             changeColorway : function(index){
//                 changeColorway(index);
//             },
//             capture,
//             stopRender,
//         }
//     }
// }())

if(window.cvInit) window.cvInit()


