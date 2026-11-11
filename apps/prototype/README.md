# Prototype

`index.html` is the original Devoal interface and the GitHub Pages entry point. The Pages build packages it with real language logos and the prepared lessons in `content/`. The browser keeps progress locally.

Some older AI controls in this interface expect a host service and are not available on GitHub Pages. The Next.js implementation in `apps/web` contains Firebase account setup and a server based Grok route; those need Firebase configuration and a server deployment before they can be enabled on this interface.
