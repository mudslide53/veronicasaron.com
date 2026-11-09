// Send www.veronicasaron.com to veronicasaron.com so Google sees one version of each page.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'www.veronicasaron.com') {
    url.hostname = 'veronicasaron.com';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
