import Script from "next/script";

const clarityScript = (projectId: string) => `
  (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "${projectId}");
`;

export default function ClarityScript({ projectId }: { projectId: string }) {
  return (
    <Script
      id={`scr-clarity-${projectId}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: clarityScript(projectId) }}
    />
  );
}
