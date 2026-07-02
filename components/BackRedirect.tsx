import Script from "next/script";

/* Back-redirect: ao tentar sair (botão voltar), leva o usuário para o link
   abaixo carregando a query string atual (UTMs). Snippet fornecido pela conta. */
const link = "https://www.mensortreinamentos.com.br";

const backRedirect = `
  const link = '${link}';

  function setBackRedirect(url) {
    let urlBackRedirect = url;
    urlBackRedirect = urlBackRedirect =
      urlBackRedirect.trim() +
      (urlBackRedirect.indexOf('?') > 0 ? '&' : '?') +
      document.location.search.replace('?', '').toString();

    history.pushState({}, '', location.href);
    history.pushState({}, '', location.href);
    history.pushState({}, '', location.href);

    window.addEventListener('popstate', () => {
      console.log('onpopstate', urlBackRedirect);
      setTimeout(() => {
        location.href = urlBackRedirect;
      }, 1);
    });
  }

  setBackRedirect(link);
`;

export default function BackRedirect() {
  return (
    <Script
      id="scr-back-redirect"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: backRedirect }}
    />
  );
}
