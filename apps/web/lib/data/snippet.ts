// The tracking snippet. Built from the referrer config so the server stays the
// source of truth: add a source to packages/core (or AI_REFERRERS_JSON) and
// every site picks it up on its next page load.
//
// What it sends, and only for visits that arrive from an AI assistant: the
// referrer hostname, utm_source, and the landing path (no query string). No
// cookies, no identifiers, nothing about the visitor.

import type { ReferrerSource } from "@privett/core";

export function buildSnippetJs(sources: ReferrerSource[], endpoint: string): string {
  const hosts = JSON.stringify([...new Set(sources.flatMap((s) => s.hosts))]);
  const utms = JSON.stringify([...new Set(sources.flatMap((s) => s.utmSources))]);
  return `/* Privett AI referral tracking. No cookies, no personal data. */
(function(){try{
var s=document.currentScript,k=s&&s.getAttribute("data-key");if(!k)return;
var H=${hosts},U=${utms},h="",u="";
try{h=document.referrer?new URL(document.referrer).hostname.toLowerCase():""}catch(e){}
try{u=(new URLSearchParams(location.search).get("utm_source")||"").toLowerCase()}catch(e){}
if(h===location.hostname)h="";
var ai=U.indexOf(u)>-1;for(var i=0;i<H.length&&!ai;i++){if(h&&(h===H[i]||h.slice(-H[i].length-1)==="."+H[i]))ai=true}
if(!ai)return;
var p=location.pathname,d="pv_t:"+p;
try{if(sessionStorage.getItem(d))return;sessionStorage.setItem(d,"1")}catch(e){}
var b=JSON.stringify({k:k,r:h,u:u,p:p}),e=${JSON.stringify(endpoint)};
if(navigator.sendBeacon&&navigator.sendBeacon(e,new Blob([b],{type:"text/plain"})))return;
fetch(e,{method:"POST",body:b,keepalive:true,mode:"no-cors",headers:{"Content-Type":"text/plain"}});
}catch(e){}})();
`;
}

export function snippetTag(appUrl: string, trackingKey: string): string {
  return `<script async src="${appUrl}/t.js" data-key="${trackingKey}"></script>`;
}
