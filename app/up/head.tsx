export default function Head() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "!function(i,n){i._plt=i._plt||(n&&n.timeOrigin?n.timeOrigin+n.now():Date.now())}(window,performance);",
        }}
      />
      <link
        rel="preload"
        href="https://scripts.converteai.net/b809ca06-75c2-4eba-ae57-2f6bbda7e885/players/6a8709fc5ad4bda4d2f019df/v4/player.js"
        as="script"
      />
      <link
        rel="preload"
        href="https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js"
        as="script"
      />
      <link
        rel="preload"
        href="https://cdn.converteai.net/b809ca06-75c2-4eba-ae57-2f6bbda7e885/6a8709b85ad4bda4d2f019bc/main.m3u8"
        as="fetch"
      />
      <link rel="dns-prefetch" href="https://cdn.converteai.net" />
      <link rel="dns-prefetch" href="https://scripts.converteai.net" />
      <link rel="dns-prefetch" href="https://images.converteai.net" />
      <link rel="dns-prefetch" href="https://license.vturb.com" />
    </>
  );
}
