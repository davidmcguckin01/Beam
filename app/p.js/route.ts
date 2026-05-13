export const runtime = "edge";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

const SCRIPT = `(function(){try{var s=document.currentScript,id=s&&s.getAttribute("data-site");if(!id)return;var q="s="+encodeURIComponent(id)+"&u="+encodeURIComponent(location.href)+"&r="+encodeURIComponent(document.referrer||""),u=${JSON.stringify(APP_URL)}+"/api/i?"+q;if(navigator.sendBeacon){navigator.sendBeacon(u)}else{fetch(u,{method:"POST",keepalive:true,mode:"no-cors"})}}catch(e){}})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}
